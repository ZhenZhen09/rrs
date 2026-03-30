import { Router } from 'express';
import { pool } from '../db';

const router = Router();

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
