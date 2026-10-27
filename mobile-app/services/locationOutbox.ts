import { getDb } from './localDb';
import { isValidLocationEvent } from '../types/tracking';
import type { LocationEvent } from '../types/tracking';

const LOCATION_RETENTION_MS = 72 * 60 * 60 * 1000;

export const appendLocationEvent = async (event: LocationEvent) => {
  if (!isValidLocationEvent(event)) {
    throw new Error('Invalid location event');
  }

  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT OR IGNORE INTO location_outbox
      (event_id, session_id, request_id, rider_id, sequence, payload, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.eventId,
      event.sessionId,
      event.requestId,
      event.riderId,
      event.sequence,
      JSON.stringify(event),
      now,
      now + LOCATION_RETENTION_MS,
    ],
  );
};

export const getPendingLocationEvents = async (riderId: string, limit = 50): Promise<LocationEvent[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    "SELECT payload FROM location_outbox WHERE rider_id = ? AND status = 'pending' ORDER BY sequence ASC LIMIT ?",
    [riderId, limit],
  ) as { payload: string }[];

  return rows.map((row) => JSON.parse(row.payload) as LocationEvent);
};

export const getLocationOutboxSummary = async (riderId: string) => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    "SELECT status, last_error, created_at FROM location_outbox WHERE rider_id = ? AND status IN ('pending', 'rejected') ORDER BY created_at ASC",
    [riderId],
  ) as Array<{ status: string; last_error: string | null; created_at: number }>;
  return {
    pending: rows.filter((row) => row.status === 'pending').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
    lastError: rows.find((row) => row.last_error)?.last_error || null,
  };
};

export const acknowledgeLocationEvents = async (eventIds: string[]) => {
  if (eventIds.length === 0) return;
  const db = await getDb();
  const placeholders = eventIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM location_outbox WHERE event_id IN (${placeholders})`,
    eventIds,
  );
};

export const markLocationEventsForRetry = async (eventIds: string[], error: string) => {
  if (eventIds.length === 0) return;
  const db = await getDb();
  const placeholders = eventIds.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE location_outbox SET status = 'pending', retry_count = retry_count + 1, last_error = ? WHERE event_id IN (${placeholders})`,
    [error, ...eventIds],
  );
};

export const markLocationEventsRejected = async (eventIds: string[], error: string) => {
  if (eventIds.length === 0) return;
  const db = await getDb();
  const placeholders = eventIds.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE location_outbox SET status = 'rejected', last_error = ? WHERE event_id IN (${placeholders})`,
    [error, ...eventIds],
  );
};
