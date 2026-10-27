import { getDb } from './localDb';
import { api } from '@/utils/api';
import { AuthManager } from '@/utils/AuthManager';

const createQueueId = () => {
  const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return cryptoObject?.randomUUID
    ? cryptoObject.randomUUID()
    : `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export type RiderStatusAction = {
  operation_id: string;
  rider_id: string;
  request_id: string;
  status: string;
  remark: string;
  timestamp: string;
  state: 'pending' | 'syncing' | 'acked' | 'needs_attention';
  last_error: string | null;
  created_at: number;
};

export async function queueRiderStatus(input: { riderId: string; requestId: string; status: string; remark: string; timestamp: string }) {
  const operationId = createQueueId();
  const database = await getDb();
  const now = Date.now();
  await database.runAsync(`INSERT OR IGNORE INTO rider_status_actions
    (operation_id,rider_id,request_id,status,remark,timestamp,state,created_at,updated_at)
    VALUES (?,?,?,?,?,?,'pending',?,?)`, [operationId, input.riderId, input.requestId, input.status, input.remark, input.timestamp, now, now]);
  const saved = await database.getFirstAsync('SELECT operation_id FROM rider_status_actions WHERE operation_id=?', [operationId]);
  if (!saved) throw new Error('Unable to save the delivery update on this device.');
  return { operationId };
}

export async function getRiderStatusActions(riderId: string, requestId?: string): Promise<RiderStatusAction[]> {
  const database = await getDb();
  const rows = await database.getAllAsync(
    `SELECT * FROM rider_status_actions WHERE rider_id=?${requestId ? ' AND request_id = ?' : ''} ORDER BY created_at ASC, rowid ASC`,
    requestId ? [riderId, requestId] : [riderId],
  );
  return rows as RiderStatusAction[];
}

export async function getGenericLocationQueueSummary(riderId: string) {
  const database = await getDb();
  const rows = await database.getAllAsync(`SELECT payload, status, last_error FROM sync_queue
    WHERE endpoint='/api/users/location' AND status IN ('pending', 'failed') ORDER BY created_at ASC`);
  const riderRows = rows.filter((row: any) => {
    try { return JSON.parse(row.payload)?.riderId === riderId; } catch { return false; }
  }) as Array<{ status: string; last_error: string | null }>;
  return {
    pending: riderRows.filter((row) => row.status === 'pending').length,
    rejected: riderRows.filter((row) => row.status === 'failed').length,
    lastError: riderRows.find((row) => row.last_error)?.last_error || null,
  };
}

export async function updateRiderAction(operationId: string, state: RiderStatusAction['state'], error?: string) {
  const database = await getDb();
  await database.runAsync('UPDATE rider_status_actions SET state=?, last_error=?, updated_at=? WHERE operation_id=?',
    [state, error ?? null, Date.now(), operationId]);
}

export async function processRiderStatusActions(riderId: string): Promise<void> {
  const user = await AuthManager.getUserData();
  if (!user?.id || user.id !== riderId) return;
  const actions = await getRiderStatusActions(riderId);
  const stoppedRequests = new Set<string>();
  for (const action of actions) {
    if (action.state === 'needs_attention') {
      stoppedRequests.add(action.request_id);
      continue;
    }
    if (action.state !== 'pending' || stoppedRequests.has(action.request_id)) continue;
    await updateRiderAction(action.operation_id, 'syncing');
    try {
      await api.put(`/api/requests/${action.request_id}/status`, {
        status: action.status, remark: action.remark, timestamp: action.timestamp,
      }, { headers: { 'Idempotency-Key': action.operation_id } });
      await updateRiderAction(action.operation_id, 'acked');
    } catch (error: any) {
      const status = error?.response?.status;
      if (status >= 400 && status < 500 && status !== 429) {
        await updateRiderAction(action.operation_id, 'needs_attention', error?.response?.data?.error || error.message);
        stoppedRequests.add(action.request_id);
      } else {
        await updateRiderAction(action.operation_id, 'pending', error?.message || 'Sync failed');
        stoppedRequests.add(action.request_id);
      }
    }
  }
}

/**
 * Enterprise Async Sync Queue (Phase 1.2)
 * 
 * Manages the "Outbox" for offline operations.
 */

export interface QueueItem {
  id?: number;
  endpoint: string;
  method: 'POST' | 'PUT';
  payload: any;
  idempotencyKey: string;
}

export const addToQueue = async (item: Omit<QueueItem, 'idempotencyKey'>) => {
  const db = await getDb();
  const idempotencyKey = createQueueId();
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000);

  await db.runAsync(
    `INSERT INTO sync_queue (endpoint, method, payload, idempotency_key, created_at, expires_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.endpoint, item.method, JSON.stringify(item.payload), idempotencyKey, now, expiresAt]
  );

  console.log(`[SyncQueue] Added item to outbox: ${item.endpoint}`);
  
  // Trigger immediate sync attempt
  processQueue().catch(err => console.error('[SyncQueue] Triggered sync failed:', err));
  
  return idempotencyKey;
};

export const processQueue = async () => {
  const db = await getDb();
  const activeRider = await AuthManager.getUserData();
  
  // 1. Get all pending items (SENIOR FIX: Skip failed/syncing)
  const items = await db.getAllAsync(
    "SELECT * FROM sync_queue WHERE status = 'pending' AND (expires_at > ? OR endpoint = '/api/users/location') ORDER BY priority DESC, created_at ASC",
    [Date.now()]
  ) as any[];

  if (items.length === 0) return;

  const safeItems = items.filter((item) => {
    if (item.endpoint !== '/api/users/location') return true;
    try { return JSON.parse(item.payload)?.riderId === activeRider?.id; } catch { return false; }
  });

  console.log(`[SyncQueue] Processing ${safeItems.length} items from outbox...`);

  for (const item of safeItems) {
    try {
      // Mark as syncing
      await db.runAsync("UPDATE sync_queue SET status = 'syncing' WHERE id = ?", [item.id]);

      // Execute request
      const response = await api.request({
        url: item.endpoint,
        method: item.method,
        data: JSON.parse(item.payload),
        headers: {
          'Idempotency-Key': item.idempotency_key
        }
      });

      if (response.status >= 200 && response.status < 300) {
        // Success: Remove from queue
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
        console.log(`[SyncQueue] Successfully synced: ${item.endpoint}`);
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err: any) {
      const isNetworkError = !err.response;
      const status = err.response?.status;

      // Don't retry client errors (4xx) except for transient ones
      if (!isNetworkError && status >= 400 && status < 500 && status !== 429) {
         // SPECIAL CASE: Location updates that are rejected by server hardening (stale, low accuracy)
         // should be discarded immediately to prevent queue bloat.
         console.error(`[SyncQueue] Fatal error for ${item.endpoint}:`, err.message);
         await db.runAsync(
           "UPDATE sync_queue SET status = 'failed', last_error = ? WHERE id = ?",
           [err.response?.data?.error || err.message, item.id]
         );
      } else {
        // Network error or 5xx: Revert to pending for next retry
        console.warn(`[SyncQueue] Transient error for ${item.endpoint}, will retry:`, err.message);
        await db.runAsync(
          "UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1 WHERE id = ?",
          [item.id]
        );
      }
    }
  }
};
