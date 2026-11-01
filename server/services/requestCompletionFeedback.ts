import { pool } from '../db';

let ensureTablePromise: Promise<void> | null = null;

export async function ensureRequestCompletionFeedbackTable(): Promise<void> {
  ensureTablePromise ??= pool.query(`
    CREATE TABLE IF NOT EXISTS request_completion_feedback (
      request_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
      requester_id VARCHAR(191) NOT NULL,
      outcome ENUM('yes', 'no') NOT NULL,
      comment VARCHAR(1000) NULL,
      submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_completion_feedback_requester (requester_id),
      INDEX idx_completion_feedback_outcome (outcome, submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).then(() => undefined).catch((error) => {
    ensureTablePromise = null;
    throw error;
  });

  await ensureTablePromise;
}
