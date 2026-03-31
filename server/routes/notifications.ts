import { Router } from 'express';
import { pool } from '../db';
import { Expo } from 'expo-server-sdk';

const router = Router();
const expo = new Expo();

// Helper: Send Expo Push Notification
async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    const [rows] = await pool.query('SELECT expo_push_token FROM users WHERE id = ?', [userId]) as any[];
    const token = rows[0]?.expo_push_token;

    if (!token || !Expo.isExpoPushToken(token)) {
      console.log(`⚠️ Invalid or missing Expo Push Token for user ${userId}`);
      return;
    }

    const messages: any[] = [{
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default'
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`🚀 Push notification sent to user ${userId}`);
  } catch (err) {
    console.error('❌ Error sending Expo push notification:', err);
  }
}

// Register Push Token
router.post('/register-token', async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: 'Missing userId or token' });

    await pool.query('UPDATE users SET expo_push_token = ? WHERE id = ?', [token, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all notifications (with optional userId filter and limit)
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    let query = 'SELECT * FROM notifications';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

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
router.post('/', async (req, res) => {
  try {
    const { user_id, message, type, request_id } = req.body;
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await pool.query(`
      INSERT INTO notifications (id, user_id, message, type, request_id)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user_id, message, type, request_id]);

    // REAL-TIME: Notify the specific user that they have a new notification
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting notification-added to user: ${user_id}`);
      io.to(user_id).emit('notification-added', { id, message, type, request_id });
    }

    // PUSH NOTIFICATION: Show in notification bar
    const title = type === 'new_assignment' ? '📦 New Task Assigned' : '🔔 System Update';
    await sendPushNotification(user_id, title, message, { request_id, type });
    
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark a single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark all notifications as read for a specific user
router.put('/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
