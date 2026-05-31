import { getDb } from './localDb';
import { api } from '@/utils/api';
import * as Crypto from 'expo-crypto';

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
  const idempotencyKey = Crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

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
  
  // 1. Get all pending items (SENIOR FIX: Skip failed/syncing)
  const items = await db.getAllAsync(
    "SELECT * FROM sync_queue WHERE status = 'pending' AND expires_at > ? ORDER BY priority DESC, created_at ASC",
    [Date.now()]
  ) as any[];

  if (items.length === 0) return;

  console.log(`[SyncQueue] Processing ${items.length} items from outbox...`);

  for (const item of items) {
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
         if (item.endpoint === '/api/users/location' && status === 400) {
           console.warn(`[SyncQueue] Server rejected stale/inaccurate location (ID: ${item.id}), discarding.`);
           await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
         } else {
           console.error(`[SyncQueue] Fatal error for ${item.endpoint}:`, err.message);
           await db.runAsync(
             "UPDATE sync_queue SET status = 'failed', last_error = ? WHERE id = ?",
             [err.message, item.id]
           );
         }
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
