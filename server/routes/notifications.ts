import { Router, Response } from 'express';
import { pool } from '../db';
import { Expo } from 'expo-server-sdk';
import { AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  ensureWebPushTable,
  getWebPushPublicKey,
  getWebPushSubscriptionCount,
  hasWebPushSubscription,
  removeWebPushSubscription,
  saveWebPushSubscription,
} from '../services/webPush';
import { publishSavedWebPushNotification } from '../services/deliveryNotifications';
import { isPermanentFcmTokenError, sendFcmNotification } from '../services/fcm';

const router = Router();
const expo = new Expo();
const notificationCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many notifications. Please try again shortly.' },
});
const createNotificationSchema = z.object({
  user_id: z.string().min(1).max(191),
  message: z.string().trim().min(1).max(500),
  type: z.enum([
    'request_submitted', 'request_cancelled', 'assignment_cancelled', 'new_assignment',
    'request_approved', 'request_disapproved', 'request_revision', 'deviation_requested',
    'route_optimization', 'rider_assigned', 'delivery_reminder', 'info', 'warning',
  ]),
  request_id: z.string().max(191).nullable().optional(),
}).strict();
const pushTokenSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  provider: z.enum(['fcm', 'expo']).optional(),
  platform: z.enum(['android', 'ios']).optional(),
}).strict();
const pushTokenRemovalSchema = z.object({ provider: z.enum(['fcm', 'expo']) }).strict();

function isValidWebPushSubscription(value: any): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 4096 || !value.keys) return false;
  let endpoint: URL;
  try { endpoint = new URL(value.endpoint); } catch { return false; }
  return isAllowedWebPushEndpoint(endpoint) &&
    typeof value.keys.p256dh === 'string' && value.keys.p256dh.length > 0 && value.keys.p256dh.length <= 1024 &&
    typeof value.keys.auth === 'string' && value.keys.auth.length > 0 && value.keys.auth.length <= 1024;
}

function isAllowedWebPushEndpoint(endpoint: URL): boolean {
  if (endpoint.protocol !== 'https:' || endpoint.port || endpoint.username || endpoint.password) return false;
  const hostname = endpoint.hostname.toLowerCase().replace(/\\.$/, '');
  return hostname === 'fcm.googleapis.com' || hostname.endsWith('.push.services.mozilla.com') ||
    hostname === 'push.services.mozilla.com' || hostname.endsWith('.notify.windows.com') ||
    hostname === 'web.push.apple.com' || hostname.endsWith('.push.apple.com');
}

// Browser push setup. The public key is safe to expose; private VAPID keys stay server-side.
router.get('/web-push/config', async (_req, res) => {
  res.json({ enabled: Boolean(getWebPushPublicKey()), publicKey: getWebPushPublicKey() });
});

router.get('/web-push/status', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
  try {
    await ensureWebPushTable();
    const count = await getWebPushSubscriptionCount(req.user!.id);
    res.json({ enabled: Boolean(getWebPushPublicKey()), subscribed: count > 0 });
  } catch (error) {
    console.error('[WEB PUSH] Status request failed.');
    res.status(500).json({ error: 'Unable to read notification status' });
  }
});

router.post('/web-push/status', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
  try {
    await ensureWebPushTable();
    const endpoint = req.body?.endpoint;
    if (endpoint == null) {
      return res.json({ enabled: Boolean(getWebPushPublicKey()), subscribed: false });
    }
    let parsedEndpoint: URL;
    try { parsedEndpoint = new URL(endpoint); } catch { return res.status(400).json({ error: 'Invalid browser push endpoint.' }); }
    if (typeof endpoint !== 'string' || endpoint.length > 4096 || !isAllowedWebPushEndpoint(parsedEndpoint)) {
      return res.status(400).json({ error: 'Invalid browser push endpoint.' });
    }
    const subscribed = await hasWebPushSubscription(req.user!.id, endpoint);
    res.json({ enabled: Boolean(getWebPushPublicKey()), subscribed });
  } catch {
    console.error('[WEB PUSH] Device status request failed.');
    res.status(500).json({ error: 'Unable to read notification status' });
  }
});

router.post('/web-push/subscribe', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
  try {
    if (!getWebPushPublicKey()) {
      return res.status(503).json({ error: 'Browser notifications are not configured.' });
    }
    if (!isValidWebPushSubscription(req.body?.subscription)) {
      return res.status(400).json({ error: 'Invalid browser push subscription.' });
    }

    await ensureWebPushTable();
    await saveWebPushSubscription(req.user!.id, req.body.subscription, req.headers['user-agent']);
    res.json({ success: true });
  } catch (error) {
    console.error('[WEB PUSH] Subscription registration failed.');
    res.status(500).json({ error: 'Unable to enable browser notifications' });
  }
});

router.delete('/web-push/subscribe', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
  try {
    const endpoint = req.body?.endpoint;
    let parsedEndpoint: URL | null = null;
    try { if (typeof endpoint === 'string' && endpoint.length <= 4096) parsedEndpoint = new URL(endpoint); } catch { /* reject below */ }
    if (!parsedEndpoint || !isAllowedWebPushEndpoint(parsedEndpoint)) {
      return res.status(400).json({ error: 'Invalid browser push endpoint.' });
    }
    await removeWebPushSubscription(req.user!.id, endpoint);
    res.json({ success: true });
  } catch (error) {
    console.error('[WEB PUSH] Subscription deletion failed.');
    res.status(500).json({ error: 'Unable to disable browser notifications' });
  }
});

// Helper: Send Expo Push Notification
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any,
  options?: { channelId?: string; categoryId?: string; tag?: string },
): Promise<{ sent: boolean; providerMessageId?: string; reason?: string }> {
  try {
    const [rows] = await pool.query('SELECT fcm_token, expo_push_token, role FROM users WHERE id = ?', [userId]) as any[];
    if (rows[0]?.role !== 'rider') return { sent: false, reason: 'Recipient is not a rider' };
    const fcmToken = rows[0]?.fcm_token;
    const token = rows[0]?.expo_push_token;
    const urgentTypes = new Set([
      'new_assignment', 'assignment_cancelled', 'conversation_message',
      'delivery_at_risk', 'delivery_overdue', 'delivery_overdue_reminder',
    ]);
    const urgent = options?.channelId === 'delivery_urgent' || urgentTypes.has(String(data?.type || ''));
    const notificationData = {
      ...(data || {}),
      eventId: data?.eventId || data?.notificationId || data?.messageId || data?.request_id || data?.requestId || data?.conversationId || `push-${Date.now()}`,
    };

    if (fcmToken) {
      try {
        const providerMessageId = await sendFcmNotification(fcmToken, {
          title,
          body,
          data: notificationData,
          channelId: urgent ? 'delivery_urgent' : options?.channelId || 'delivery_updates',
          categoryId: options?.categoryId,
          tag: options?.tag,
          priority: urgent ? 'high' : 'normal',
        });
        return { sent: true, providerMessageId };
      } catch (error) {
        if (isPermanentFcmTokenError(error)) {
          await pool.query('UPDATE users SET fcm_token = NULL WHERE id = ? AND fcm_token = ?', [userId, fcmToken]);
        }
        console.error('[FCM] Push delivery failed.');
        return { sent: false, reason: error instanceof Error ? error.message : 'FCM delivery failed' };
      }
    }

    if (!token || !Expo.isExpoPushToken(token)) {
      console.log(`⚠️ Invalid or missing Expo Push Token for user ${userId}`);
      return { sent: false, reason: 'No registered push token' };
    }

    const messages: any[] = [{
      to: token,
      sound: 'default',
      title,
      body,
      data: notificationData,
      priority: options?.channelId === 'delivery_updates' ? 'default' : 'high',
      channelId: options?.channelId || 'default',
      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options?.tag ? { tag: options.tag } : {}),
    }];

    const chunks = expo.chunkPushNotifications(messages);
    let providerMessageId: string | undefined;
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      const accepted = tickets.find(ticket => ticket.status === 'ok');
      providerMessageId ||= accepted && 'id' in accepted ? accepted.id : undefined;
    }
    return { sent: true, providerMessageId };
    console.log(`🚀 Push notification sent to user ${userId}`);
  } catch (err) {
    console.error('[PUSH] Provider delivery failed.');
    return { sent: false, reason: err instanceof Error ? err.message : 'Push provider delivery failed' };
  }
}

// Register Push Token
router.post('/register-token', async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const parsed = pushTokenSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid push token registration' });
    if (user.role !== 'rider') return res.status(403).json({ error: 'Only riders can register mobile push tokens' });
    const provider = parsed.data.provider || 'expo';
    if (provider === 'fcm' && !parsed.data.platform) {
      return res.status(400).json({ error: 'FCM platform is required' });
    }
    const update = provider === 'fcm'
      ? 'UPDATE users SET fcm_token = ?, expo_push_token = NULL WHERE id = ?'
      : 'UPDATE users SET expo_push_token = ? WHERE id = ?';
    await pool.query(update, [parsed.data.token, user.id]);
    console.log(`📲 Registered ${provider} push token for rider`);
    res.json({ success: true });
  } catch (error) {
    console.error('Push registration failed.');
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/unregister-token', async (req, res) => {
  try {
    const user = (req as AuthRequest).user!;
    const parsed = pushTokenRemovalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid push token provider' });
    if (user.role !== 'rider') return res.status(403).json({ error: 'Only riders can unregister mobile push tokens' });
    const clearTokens = parsed.data.provider === 'fcm'
      ? 'fcm_token = NULL, expo_push_token = NULL'
      : 'expo_push_token = NULL';
    await pool.query(`UPDATE users SET ${clearTokens} WHERE id = ?`, [user.id]);
    res.json({ success: true });
  } catch {
    console.error('Push token unregistration failed.');
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all notifications (Filtered by authenticated user)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [user.id];

    // Limit to 50 to prevent UI flooding and DB strain
    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new notification
router.post('/', notificationCreateLimiter, authorize(['admin']), async (req, res) => {
  try {
    const parsed = createNotificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid notification payload' });
    const { user_id, message, type, request_id } = parsed.data;
    const requestId = request_id ?? null;
    const [recipients] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]) as any[];
    if (!recipients.length) return res.status(404).json({ error: 'Notification recipient not found' });
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await pool.query(`
      INSERT INTO notifications (id, user_id, message, type, request_id)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user_id, message, type, requestId]);

    await publishSavedWebPushNotification({ id, user_id, message, type, request_id: requestId || '' });

    // REAL-TIME: Notify the specific user that they have a new notification
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting notification-added to user: ${user_id}`);
      io.to(user_id).emit('notification-added', { id, message, type, request_id: requestId });
    }

    // PUSH NOTIFICATION: Show in notification bar
    const title = type === 'new_assignment' ? '📦 New Task Assigned' : '🔔 System Update';
    await sendPushNotification(user_id, title, message, { notificationId: id, request_id: requestId, type });
    
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark a single notification as read with BOLA protection
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;
    
    // Ensure the notification belongs to the user
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark all notifications as read (Securely uses token user ID)
router.put('/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = (req as AuthRequest).user!;

    // SECURITY: Prevent a user from marking another user's notifications as read
    if (userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to modify these notifications' });
    }

    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
