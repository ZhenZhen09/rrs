import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { appendIncomingTasks, RiderQueueValidationError, validateQueueReplacement, type RiderQueueTask } from '../utils/riderQueue';

const TERMINAL = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];
const STARTED = new Set(['in_progress', 'arrived', 'picked_up', 'arrived_at_pickup', 'arrived_at_dropoff']);

interface QueueRow extends RowDataPacket, RiderQueueTask {
  assigned_rider_id: string;
  status: string;
  delivery_date: string | Date | null;
  created_at: string | Date | null;
}

export async function lockRiderQueues(connection: PoolConnection, riderIds: string[]): Promise<void> {
  const sortedIds = [...new Set(riderIds.map(String))].sort();
  for (const riderId of sortedIds) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? AND role = \'rider\' FOR UPDATE', [riderId]);
    if (!rows.length) throw new RiderQueueValidationError(`Rider ${riderId} does not exist.`);
  }
}

async function loadActiveQueue(connection: PoolConnection, riderId: string): Promise<QueueRow[]> {
  const [rows] = await connection.query<QueueRow[]>(`
    SELECT request_id, delivery_status, queue_order, assigned_rider_id, status, delivery_date, created_at
    FROM delivery_requests
    WHERE assigned_rider_id = ?
      AND status = 'approved'
      AND (delivery_status IS NULL OR delivery_status NOT IN (?))
    ORDER BY queue_order IS NULL ASC, queue_order ASC, delivery_date ASC, created_at ASC, request_id ASC
    FOR UPDATE
  `, [riderId, TERMINAL]);
  return rows;
}

async function persistQueue(connection: PoolConnection, queueIds: string[], existingRows: QueueRow[]): Promise<void> {
  // A temporary range makes rank swaps safe if the production schema has a unique rider/rank index.
  const maxRank = existingRows.reduce((max, row) => Math.max(max, Number(row.queue_order) || 0), 0);
  const offset = maxRank + queueIds.length + 1;
  for (let index = 0; index < queueIds.length; index += 1) {
    await connection.query('UPDATE delivery_requests SET queue_order = ? WHERE request_id = ?', [offset + index, queueIds[index]]);
  }
  for (let index = 0; index < queueIds.length; index += 1) {
    await connection.query('UPDATE delivery_requests SET queue_order = ? WHERE request_id = ?', [index + 1, queueIds[index]]);
  }
}

export async function appendRequestsToRiderQueue(
  connection: PoolConnection,
  riderId: string,
  requestIds: string[],
  incomingOrder: string[] = requestIds,
): Promise<number[]> {
  await lockRiderQueues(connection, [riderId]);
  const rows = await loadActiveQueue(connection, riderId);
  const incomingSet = new Set(requestIds.map(String));
  const activeExisting = rows.filter((row) => !incomingSet.has(String(row.request_id)));

  if (incomingSet.size !== requestIds.length || incomingOrder.length !== requestIds.length) {
    throw new RiderQueueValidationError('Incoming requests and order must contain unique request IDs.');
  }
  const [incomingRows] = await connection.query<RowDataPacket[]>(`
    SELECT request_id, delivery_status FROM delivery_requests
    WHERE request_id IN (?) AND assigned_rider_id = ? AND status = 'approved'
      AND (delivery_status IS NULL OR delivery_status NOT IN (?))
    FOR UPDATE
  `, [requestIds, riderId, TERMINAL]);
  if (incomingRows.length !== incomingSet.size) {
    throw new RiderQueueValidationError('Every incoming request must be an active task assigned to the selected rider.');
  }

  const incomingById = new Map((incomingRows as Array<{ request_id: string; delivery_status: string | null }>).map((row) => [String(row.request_id), row]));
  const appended = appendIncomingTasks(activeExisting.map((row) => String(row.request_id)), requestIds.map(String), incomingOrder.map(String));
  const existingStarted = activeExisting.filter((row) => STARTED.has(row.delivery_status ?? '')).map((row) => String(row.request_id));
  const existingUnstarted = activeExisting.filter((row) => !STARTED.has(row.delivery_status ?? '')).map((row) => String(row.request_id));
  const incomingStarted = appended.filter((id) => incomingSet.has(id) && STARTED.has(incomingById.get(id)?.delivery_status ?? ''));
  const incomingUnstarted = appended.filter((id) => incomingSet.has(id) && !STARTED.has(incomingById.get(id)?.delivery_status ?? ''));
  const completeQueue = [...existingStarted, ...incomingStarted, ...existingUnstarted, ...incomingUnstarted];
  await persistQueue(connection, completeQueue, activeExisting);
  return requestIds.map((id) => completeQueue.indexOf(String(id)) + 1);
}

export async function replaceRiderQueueOrder(
  connection: PoolConnection,
  riderId: string,
  submittedIds: string[],
): Promise<string[]> {
  await lockRiderQueues(connection, [riderId]);
  const rows = await loadActiveQueue(connection, riderId);
  const validated = validateQueueReplacement(rows, submittedIds.map(String));
  await persistQueue(connection, validated, rows);
  return validated;
}

export async function normalizeRiderQueueOrder(connection: PoolConnection, riderId: string): Promise<void> {
  await lockRiderQueues(connection, [riderId]);
  const rows = await loadActiveQueue(connection, riderId);
  const ids = rows.map((row) => String(row.request_id));
  await persistQueue(connection, ids, rows);
}
