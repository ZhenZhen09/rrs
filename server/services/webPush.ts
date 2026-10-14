import crypto from 'crypto';
import webpush from 'web-push';
import { pool } from '../db';

type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.VAPID_EMAIL || 'admin@example.com'}`;
let configured = false;

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error('[WEB PUSH] Invalid VAPID configuration; browser push is disabled until valid keys are supplied.', error);
  }
} else {
  console.warn('[WEB PUSH] VAPID keys are not configured; browser push is disabled.');
}

export const getWebPushPublicKey = () => (configured ? publicKey : null);
export const isWebPushConfigured = () => configured;

export async function ensureWebPushTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      endpoint_hash CHAR(64) NOT NULL PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent VARCHAR(512) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_web_push_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function saveWebPushSubscription(userId: string, subscription: PushSubscriptionRecord, userAgent?: string) {
  const endpointHash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex');

  await pool.query(`
    INSERT INTO web_push_subscriptions
      (endpoint_hash, user_id, endpoint, p256dh, auth, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      user_agent = VALUES(user_agent),
      updated_at = CURRENT_TIMESTAMP
  `, [endpointHash, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent || null]);
}

export async function removeWebPushSubscription(userId: string, endpoint: string) {
  const endpointHash = crypto.createHash('sha256').update(endpoint).digest('hex');
  await pool.query('DELETE FROM web_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', [endpointHash, userId]);
}

export async function getWebPushSubscriptionCount(userId: string) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM web_push_subscriptions WHERE user_id = ?', [userId]) as any[];
  return Number(rows[0]?.count || 0);
}

export async function hasWebPushSubscription(userId: string, endpoint: string) {
  const endpointHash = crypto.createHash('sha256').update(endpoint).digest('hex');
  const [rows] = await pool.query(
    'SELECT 1 FROM web_push_subscriptions WHERE endpoint_hash = ? AND user_id = ? LIMIT 1',
    [endpointHash, userId],
  ) as any[];
  return Boolean(rows?.length);
}

let workerStarted = false;

export async function startWebPushWorker() {
  if (workerStarted) return;
  const { dispatchPendingWebPushBatch, ensureWebPushQueueTables } = await import('./webPushQueue');
  await ensureWebPushQueueTables();
  workerStarted = true;

  const run = async () => {
    try {
      await dispatchPendingWebPushBatch();
    } catch (error) {
      // Provider/worker failures do not affect the saved in-app notification.
      const details = error as { code?: unknown; message?: unknown; sqlMessage?: unknown } | null;
      console.error('[WEB PUSH] Dispatcher pass failed:', {
        code: typeof details?.code === 'string' ? details.code : 'UNKNOWN',
        message: typeof details?.sqlMessage === 'string'
          ? details.sqlMessage
          : typeof details?.message === 'string'
            ? details.message
            : String(error),
      });
    }
  };

  await run();
  const timer = setInterval(() => { void run(); }, 5000);
  timer.unref?.();
}
