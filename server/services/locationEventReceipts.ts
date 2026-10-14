import { pool } from '../db';

let tableReady: Promise<void> | null = null;

export async function ensureLocationEventReceiptsTable() {
  if (!tableReady) {
    tableReady = pool.query(`
    CREATE TABLE IF NOT EXISTS location_event_receipts (
      event_id VARCHAR(191) PRIMARY KEY,
      session_id VARCHAR(191) NOT NULL,
      request_id VARCHAR(191) NOT NULL,
      rider_id VARCHAR(191) NOT NULL,
      sequence_number BIGINT NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_location_event_receipts_request (request_id, sequence_number),
      INDEX idx_location_event_receipts_rider (rider_id, received_at)
    )
    `).then(() => undefined);
  }
  await tableReady;
}
