import webpush from 'web-push';
import { pool } from '../db';
import { isWebPushConfigured } from './webPush';

const MAX_ATTEMPTS = 8;
const LOCK_SECONDS = 120;
const BATCH_SIZE = 25;

type WebPushRole = 'admin' | 'personnel';

const WEB_PUSH_EVENTS_BY_ROLE: Record<WebPushRole, readonly string[]> = {
  admin: ['request_submitted', 'assignment_cancelled', 'deviation_requested'],
  personnel: ['request_approved', 'request_disapproved', 'request_revision', 'request_cancelled'],
};

export interface QueuedWebPushNotification {
  id: string;
  user_id: string;
  type: string;
  request_id: string | null;
  role: WebPushRole;
  message: string;
}

export interface WebPushPayload {
  title: string;
  body: string;
  tag: string;
  data: { notificationId: string; requestId: string | null; type: string; role: WebPushRole; url: string };
}

function normalizeRole(role: string): string {
  return String(role || '').trim().toLowerCase();
}

export function isEligibleWebPush(role: string, type: string): boolean {
  const normalizedRole = normalizeRole(role);
  return (WEB_PUSH_EVENTS_BY_ROLE[normalizedRole as WebPushRole] || []).includes(type);
}

export function isPotentialWebPushType(type: string): boolean {
  return Object.values(WEB_PUSH_EVENTS_BY_ROLE).some((types) => types.includes(type));
}

function getApprovedCopy(type: string) {
  switch (type) {
    case 'request_submitted': return ['New request submitted', 'A new personnel request is ready for review.'];
    case 'assignment_cancelled': return ['Dispatch issue', 'An assignment was cancelled. Review the request.'];
    case 'deviation_requested': return ['Rider deviation request', 'A rider requested a route deviation.'];
    case 'request_approved': return ['Request approved', 'Your request was approved.'];
    case 'request_disapproved': return ['Request declined', 'Your request was declined.'];
    case 'request_revision': return ['Revision requested', 'Your request needs a revision.'];
    case 'request_cancelled': return ['Request cancelled', 'Your request was cancelled.'];
    default: return ['Rider Scheduling System', 'You have a new update.'];
  }
}

export function makeWebPushPayload(notification: QueuedWebPushNotification): WebPushPayload {
  const role = normalizeRole(notification.role);
  const requestId = notification.request_id == null ? null : String(notification.request_id);
  const [title, body] = getApprovedCopy(notification.type);
  const url = requestId
    ? role === 'admin'
      ? `/admin/dashboard?request=${encodeURIComponent(requestId)}`
      : `/personnel/v2?request=${encodeURIComponent(requestId)}`
    : role === 'admin' ? '/admin/dashboard' : '/personnel/v2';

  return {
    title,
    body,
    tag: String(notification.id),
    data: { notificationId: String(notification.id), requestId, type: notification.type, role: role as WebPushRole, url },
  };
}

export function getWebPushRetryDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(60 * 60 * 1000, 1000 * (2 ** Math.min(safeAttempt - 1, 12)));
}

export async function ensureWebPushQueueTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_push_queue (
      notification_id VARCHAR(191) NOT NULL PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      recipient_role VARCHAR(32) NOT NULL,
      notification_type VARCHAR(64) NOT NULL,
      request_id VARCHAR(191) NULL,
      status ENUM('pending', 'processing', 'complete') NOT NULL DEFAULT 'pending',
      next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_until TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_web_push_queue_due (status, next_attempt_at, locked_until)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_push_deliveries (
      notification_id VARCHAR(191) NOT NULL,
      endpoint_hash CHAR(64) NOT NULL,
      user_id VARCHAR(191) NOT NULL,
      status ENUM('pending', 'processing', 'sent', 'gone', 'failed') NOT NULL DEFAULT 'pending',
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_until TIMESTAMP NULL,
      last_error_code VARCHAR(32) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (notification_id, endpoint_hash),
      INDEX idx_web_push_delivery_due (status, next_attempt_at, locked_until),
      INDEX idx_web_push_delivery_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_push_queue_state (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      reconcile_after TIMESTAMP NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Bound the one-time recovery window so first deployment cannot fan out old inbox history.
  await pool.query(`
    INSERT IGNORE INTO web_push_queue_state (id, reconcile_after)
    VALUES (1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE))
  `);
}

let ensureQueueTablesPromise: Promise<void> | null = null;

export async function enqueueWebPush(notificationId: string): Promise<void> {
  ensureQueueTablesPromise ??= ensureWebPushQueueTables().catch((error) => {
    ensureQueueTablesPromise = null;
    throw error;
  });
  await ensureQueueTablesPromise;
  const [rows] = await pool.query(
    `SELECT n.id, n.user_id, n.type, n.request_id, u.role
     FROM notifications n
     INNER JOIN users u ON n.user_id COLLATE utf8mb4_unicode_ci = u.id
     WHERE n.id = ? LIMIT 1`,
    [notificationId],
  ) as any[];
  const notification = rows?.[0];
  if (!notification || !isEligibleWebPush(String(notification.role), String(notification.type))) return;

  await pool.query(
    `INSERT IGNORE INTO web_push_queue
      (notification_id, user_id, recipient_role, notification_type, request_id)
     VALUES (?, ?, ?, ?, ?)`,
    [notification.id, notification.user_id, normalizeRole(notification.role), notification.type, notification.request_id ?? null],
  );
}

export async function reconcileUnqueuedWebPushNotifications(batchSize = BATCH_SIZE): Promise<number> {
  const [rows] = await pool.query(
    `SELECT n.id
     FROM notifications n
      INNER JOIN users u ON n.user_id COLLATE utf8mb4_unicode_ci = u.id
      LEFT JOIN web_push_queue q ON q.notification_id = n.id COLLATE utf8mb4_unicode_ci
     INNER JOIN web_push_queue_state state ON state.id = 1 AND n.created_at >= state.reconcile_after
     WHERE q.notification_id IS NULL AND (
       (LOWER(u.role) = 'admin' AND n.type IN ('request_submitted', 'assignment_cancelled', 'deviation_requested')) OR
       (LOWER(u.role) = 'personnel' AND n.type IN ('request_approved', 'request_disapproved', 'request_revision', 'request_cancelled'))
     )
     ORDER BY n.id
     LIMIT ?`,
    [Math.max(1, Math.min(Math.floor(batchSize), 500))],
  ) as any[];
  for (const row of rows as Array<{ id: string }>) await enqueueWebPush(String(row.id));
  return (rows as any[]).length;
}

async function claimQueueItem() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT notification_id, user_id, recipient_role, notification_type, request_id
       FROM web_push_queue
       WHERE (status = 'pending' AND next_attempt_at <= CURRENT_TIMESTAMP)
          OR (status = 'processing' AND locked_until < CURRENT_TIMESTAMP)
       ORDER BY next_attempt_at, created_at
       LIMIT 1 FOR UPDATE`,
    ) as any[];
    const item = rows?.[0];
    if (!item) {
      await connection.commit();
      return null;
    }

    await connection.query(
      `UPDATE web_push_queue SET status = 'processing', locked_until = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND)
       WHERE notification_id = ?`,
      [LOCK_SECONDS, item.notification_id],
    );
    const [subscriptions] = await connection.query(
      `SELECT endpoint_hash, user_id FROM web_push_subscriptions WHERE user_id = ?`,
      [item.user_id],
    ) as any[];
    for (const subscription of subscriptions as any[]) {
      await connection.query(
        `INSERT IGNORE INTO web_push_deliveries (notification_id, endpoint_hash, user_id)
         VALUES (?, ?, ?)`,
        [item.notification_id, subscription.endpoint_hash, item.user_id],
      );
    }
    await connection.commit();
    return {
      notification: {
        id: String(item.notification_id),
        user_id: String(item.user_id),
        role: normalizeRole(String(item.recipient_role)) as WebPushRole,
        type: String(item.notification_type),
        request_id: item.request_id == null ? null : String(item.request_id),
        message: '',
      },
      hasSubscriptions: (subscriptions as any[]).length > 0,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function claimDelivery(notificationId: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT d.endpoint_hash, d.user_id, d.attempts, s.endpoint, s.p256dh, s.auth
       FROM web_push_deliveries d
       INNER JOIN web_push_subscriptions s
         ON s.endpoint_hash = d.endpoint_hash AND s.user_id = d.user_id
       WHERE d.notification_id = ?
         AND ((d.status = 'pending' AND d.next_attempt_at <= CURRENT_TIMESTAMP)
           OR (d.status = 'processing' AND d.locked_until < CURRENT_TIMESTAMP))
       ORDER BY d.next_attempt_at
       LIMIT 1 FOR UPDATE`,
      [notificationId],
    ) as any[];
    const row = rows?.[0];
    if (!row) {
      await connection.commit();
      return null;
    }
    const attempts = Number(row.attempts || 0) + 1;
    await connection.query(
      `UPDATE web_push_deliveries SET status = 'processing', attempts = ?,
         locked_until = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND), last_error_code = NULL
       WHERE notification_id = ? AND endpoint_hash = ?`,
      [attempts, LOCK_SECONDS, notificationId, row.endpoint_hash],
    );
    await connection.commit();
    return { ...row, attempts };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function safeErrorCode(error: any): string {
  const status = Number(error?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 600) return String(status);
  return 'network_error';
}

async function sendDelivery(notificationId: string, notification: QueuedWebPushNotification, delivery: any) {
  const payload = makeWebPushPayload(notification);
  try {
    await webpush.sendNotification(
      { endpoint: delivery.endpoint, keys: { p256dh: delivery.p256dh, auth: delivery.auth } },
      JSON.stringify(payload),
    );
    await pool.query(
      `UPDATE web_push_deliveries SET status = 'sent', locked_until = NULL, last_error_code = NULL
       WHERE notification_id = ? AND endpoint_hash = ? AND user_id = ?`,
      [notificationId, delivery.endpoint_hash, delivery.user_id],
    );
  } catch (error: any) {
    const code = safeErrorCode(error);
    if (code === '404' || code === '410') {
      await pool.query(
        'DELETE FROM web_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?',
        [delivery.endpoint_hash, delivery.user_id],
      );
      await pool.query(
        `UPDATE web_push_deliveries SET status = 'gone', locked_until = NULL, last_error_code = ?
         WHERE notification_id = ? AND endpoint_hash = ? AND user_id = ?`,
        [code, notificationId, delivery.endpoint_hash, delivery.user_id],
      );
      return;
    }

    const terminal = Number(delivery.attempts) >= MAX_ATTEMPTS;
    const delayMs = getWebPushRetryDelayMs(Number(delivery.attempts));
    await pool.query(
      `UPDATE web_push_deliveries SET status = ?, locked_until = NULL,
         next_attempt_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MICROSECOND), last_error_code = ?
       WHERE notification_id = ? AND endpoint_hash = ? AND user_id = ?`,
      [terminal ? 'failed' : 'pending', delayMs * 1000, code, notificationId, delivery.endpoint_hash, delivery.user_id],
    );
    console.error('[WEB PUSH] Delivery attempt failed:', code);
  }
}

async function finishQueueItem(notificationId: string) {
  await pool.query(
    `UPDATE web_push_queue q
     SET q.status = CASE WHEN NOT EXISTS (
           SELECT 1 FROM web_push_deliveries d
           WHERE d.notification_id = q.notification_id AND d.status IN ('pending', 'processing')
         ) THEN 'complete' ELSE 'pending' END,
         q.locked_until = NULL,
         q.next_attempt_at = COALESCE((
           SELECT MIN(d.next_attempt_at) FROM web_push_deliveries d
           WHERE d.notification_id = q.notification_id AND d.status = 'pending'
         ), CURRENT_TIMESTAMP)
     WHERE q.notification_id = ?`,
    [notificationId],
  );
}

async function processOneQueueItem() {
  const claimed = await claimQueueItem();
  if (!claimed) return false;
  if (!claimed.hasSubscriptions) {
    await pool.query("UPDATE web_push_queue SET status = 'complete', locked_until = NULL WHERE notification_id = ?", [claimed.notification.id]);
    return true;
  }

  while (true) {
    const delivery = await claimDelivery(claimed.notification.id);
    if (!delivery) break;
    await sendDelivery(claimed.notification.id, claimed.notification, delivery);
  }
  await finishQueueItem(claimed.notification.id);
  return true;
}

export async function dispatchPendingWebPushBatch(batchSize = BATCH_SIZE): Promise<number> {
  await reconcileUnqueuedWebPushNotifications();
  if (!isWebPushConfigured()) return 0;
  let processed = 0;
  for (let index = 0; index < Math.max(1, Math.min(batchSize, 100)); index += 1) {
    if (!await processOneQueueItem()) break;
    processed += 1;
  }
  return processed;
}
