import { Router, Response } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import * as argon2 from 'argon2';
import { onlineRiders } from '../presence';
import { AuthRequest, authorize } from '../middleware/auth';
import fs from 'fs';
import { handleRiderLocationUpdate } from '../locationTracking';

const router = Router();

// Get all users (Admin only)
router.get('/', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query("SELECT id, email, name, role, department, status, created_at, updated_at, last_password_change, require_password_reset, mfa_enabled FROM users");
    const debugInfo = `[DEBUG ${new Date().toISOString()}] Fetched ${rows.length} users. First row keys: ${Object.keys(rows[0] || {}).join(', ')}\nSample data: ${JSON.stringify(rows[0])}\n`;
    fs.appendFileSync('api_debug.log', debugInfo);
    res.json(rows);
  } catch (error: any) {
    fs.appendFileSync('api_debug.log', `[ERROR] ${error.message}\n`);
    res.status(500).json({ error: 'Database error' });
  }
});

// Manual MFA reset (Admin only)
router.post('/:id/reset-mfa', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [result]: any = await pool.query('UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'MFA reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset MFA' });
  }
});

// Get all riders
router.get('/riders', authorize(['admin', 'personnel']), async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'rider'");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get LIVE riders (for Map)
router.get('/riders/live', authorize(['admin', 'personnel']), async (req: AuthRequest, res: Response) => {
  try {
    // Fetch all riders and their latest info, ensuring unique riders via GROUP BY
    // to prevent duplicate key warnings in the frontend when a rider has multiple active tasks.
    const [rows]: any = await pool.query(`
      SELECT u.id, u.name, u.email, u.status as user_status, u.current_lat, u.current_lng,
             MAX(dr.request_id) as request_id, 
             MAX(dr.delivery_status) as delivery_status, 
             MAX(dr.pickup_address) as pickup_address, 
             MAX(dr.time_window) as time_window
      FROM users u
      LEFT JOIN delivery_requests dr ON u.id = dr.assigned_rider_id 
        AND dr.delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')
      WHERE u.role = 'rider'
      GROUP BY u.id
    `);

    const riders = rows.map((r: any) => ({
      ...r,
      is_online: onlineRiders.has(r.id),
      last_seen: onlineRiders.get(r.id)?.lastSeen || null
    }));

    res.json(riders);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user details (Admin only)
router.patch('/:id', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, department, status } = req.body || {};
    const updates: string[] = [];
    const values: any[] = [];
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (department !== undefined) { updates.push('department = ?'); values.push(department); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields provided for update' });
    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Location Update (Rider only)
router.post('/location', async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, requestId, heading, accuracy, timestamp } = req.body || {};
    const user = req.user!;
    const io = req.app.get('io');
    
    // SECURITY: Only riders can update location
    if (user.role !== 'rider') return res.status(403).json({ error: 'Forbidden' });
    if (lat === undefined || lng === undefined) return res.status(400).json({ error: 'Missing coordinates' });

    const result = await handleRiderLocationUpdate({
      riderId: user.id,
      requestId,
      lat,
      lng,
      heading,
      accuracy,
      timestamp,
      riderName: (user as any).name || 'Rider',
      verifyAssignment: true,
      io,
    });

    if (result.reason === 'invalid_location' || result.reason === 'low_accuracy' || result.reason === 'stale_location') {
      return res.status(400).json({ error: result.reason, ...result });
    }

    if (result.reason === 'not_assigned') {
      console.warn(`⚠️ [SECURITY] Rider ${user.id} attempted to log location for unassigned task ${requestId}`);
    }

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Location log failed' });
  }
});

// Account Provisioning (Admin only)
router.post('/', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, department } = req.body || {};
    if (!name || !email || !role) return res.status(400).json({ error: 'Missing required account details' });
    
    const tempPassword = crypto.randomBytes(9).toString('base64');
    const hashedPassword = await argon2.hash(tempPassword);
    const id = `${role}_${crypto.randomBytes(4).toString('hex')}`;
    await pool.query('INSERT INTO users (id, email, name, role, department, password_hash, require_password_reset) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, email, name, role, department || null, hashedPassword, true]);
    res.status(201).json({ success: true, user: { id, name, email, role }, tempPassword });
  } catch (error) {
    res.status(500).json({ error: 'Provisioning failed' });
  }
});

// Password Reset (Admin only)
router.post('/:id/reset-password', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tempPassword = crypto.randomBytes(12).toString('base64');
    const hashedPassword = await argon2.hash(tempPassword);
    await pool.query('UPDATE users SET password_hash = ?, require_password_reset = ? WHERE id = ?', [hashedPassword, true, id]);
    res.json({ success: true, tempPassword });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Delete account (Admin only)
router.delete('/:id', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
