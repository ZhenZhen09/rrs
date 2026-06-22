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
             u.is_on_duty, u.last_battery_level, u.last_signal_strength,
             MAX(dr.request_id) as request_id, 
             MAX(dr.delivery_status) as delivery_status, 
             MAX(dr.pickup_address) as pickup_address, 
             MAX(dr.time_window) as time_window,
             (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = CURDATE() LIMIT 1) as attendance_status
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

// GET /attendance/daily (Admin only)
router.get('/attendance/daily', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const [rows]: any = await pool.query(`
      SELECT u.id as rider_id, u.name as rider_name, u.email as rider_email,
             al.status, al.reason, al.check_in_time, al.off_duty_time, al.created_at,
             (SELECT COUNT(*) FROM delivery_requests 
              WHERE assigned_rider_id = u.id 
                AND delivery_date = ?
                AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')) as active_task_count,
             (SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.handover_reason'))
              FROM movement_events 
              WHERE rider_id = u.id 
                AND event_type = 'duty_off' 
                AND DATE(timestamp) = ? 
              ORDER BY timestamp DESC LIMIT 1) as handover_reason,
             -- Integrity Score Calculation (Layer 4)
             (SELECT GREATEST(0, 100 - (
                (COUNT(CASE WHEN event_type = 'deviation_requested' THEN 1 END) * 10) +
                (COUNT(CASE WHEN event_type = 'idle_alert' THEN 1 END) * 5)
              )) FROM movement_events WHERE rider_id = u.id AND DATE(timestamp) = ?) as integrity_score
      FROM users u
      LEFT JOIN attendance_logs al ON u.id = al.rider_id AND al.date = ?
      WHERE u.role = 'rider'
      ORDER BY u.name ASC
    `, [date, date, date, date]);
    res.json(rows);
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /me/attendance (Rider only)
router.get('/me/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT status, reason FROM attendance_logs WHERE rider_id = ? AND date = CURDATE() LIMIT 1',
      [req.user!.id]
    );
    res.json(rows[0] || { status: null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch personal attendance' });
  }
});

// POST /:id/attendance (Rider only - Morning Check-in)
router.post('/:id/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const user = req.user! as any;
    const io = req.app.get('io');

    if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
    if (!['present', 'absent', 'on_leave'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await pool.query(
      'INSERT INTO attendance_logs (id, rider_id, date, status, reason, check_in_time) VALUES (?, ?, CURDATE(), ?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE status = ?, reason = ?, check_in_time = IF(status != ?, CURRENT_TIMESTAMP, check_in_time)',
      [attendanceId, id, status, reason || null, status, reason || null, status]
    );

    // If present, automatically toggle on-duty
    if (status === 'present') {
      await pool.query('UPDATE users SET is_on_duty = TRUE WHERE id = ?', [id]);
    } else {
      await pool.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [id]);
    }

    // Notify Admin
    const msg = status === 'present' 
      ? `Rider ${user.name} has checked in for shift.`
      : `Rider ${user.name} is ${status.toUpperCase()} today. Reason: ${reason || 'N/A'}`;
    
    io.to('admin-room').emit('notification-added', {
      id: `notif_att_${Date.now()}`,
      message: msg,
      type: status === 'present' ? 'info' : 'warning'
    });

    // INSTANT SYNC: Tell all admins to refresh their rider availability lists
    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });

    // Real-time sync for the rider
    io.to(id).emit('attendance-updated', { status });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Attendance submit error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Attendance already logged for today' });
    res.status(500).json({ error: 'Attendance log failed' });
  }
});

// Toggle On-Duty status (Rider only)
router.post('/:id/duty', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_on_duty, reason } = req.body;
    const user = req.user! as any;
    const io = req.app.get('io');

    if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });

    // New Handover Rule: Block going off-duty if active tasks (today, overdue, or in-progress) exist UNLESS a reason is provided
    if (is_on_duty === false) {
      const [activeTasks]: any = await pool.query(
        `SELECT request_id FROM delivery_requests 
         WHERE assigned_rider_id = ? 
         AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')
         AND (delivery_date <= CURDATE() OR delivery_status = 'in_progress')`,
        [id]
      );
      
      if (activeTasks.length > 0 && !reason) {
        return res.status(400).json({ 
          error: `Cannot go off duty with ${activeTasks.length} active tasks. Please provide a reason for the delay.` 
        });
      }

      // If logging off with tasks, notify Admin
      if (activeTasks.length > 0 && reason) {
        io.to('admin-room').emit('notification-added', {
          id: `notif_handover_${Date.now()}`,
          message: `⚠️ Rider ${user.name} logged off with ${activeTasks.length} UNFINISHED tasks. Reason: ${reason}`,
          type: 'warning'
        });
      }
    }

    await pool.query('UPDATE users SET is_on_duty = ? WHERE id = ?', [is_on_duty, id]);
    
    // INSTANT SYNC: Tell all admins to refresh their rider availability lists
    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'duty', is_on_duty });

    // FAILSAFE ATTENDANCE: If toggling ON, ensure a 'present' log exists for today
    if (is_on_duty === true) {
      const attendanceId = `att_${Date.now()}_fs_${Math.random().toString(36).substring(7)}`;
      
      // SUPERPOWERED FIX: Clear off_duty_time when coming back to duty.
      // This "heals" the record and removes false conflicts from the Admin Dashboard.
      await pool.query(
        'UPDATE attendance_logs SET off_duty_time = NULL WHERE rider_id = ? AND date = CURDATE()',
        [id]
      ).catch(e => console.error('[HealAttendance] Failed to clear off_duty_time:', e));

      await pool.query(
        'INSERT IGNORE INTO attendance_logs (id, rider_id, date, status, check_in_time) VALUES (?, ?, CURDATE(), \'present\', CURRENT_TIMESTAMP)',
        [attendanceId, id]
      ).catch(e => console.error('[FailsafeAttendance] Failed:', e));
    }

    // SHIFT END LOGGING: If toggling OFF, update attendance_logs for today
    if (is_on_duty === false) {
      await pool.query(
        'UPDATE attendance_logs SET off_duty_time = NOW() WHERE rider_id = ? AND date = CURDATE()',
        [id]
      ).catch(e => console.error('[ShiftEnd] Failed to log off_duty_time:', e));
    }
    
    // Log the event (Non-blocking to the main status update)
    try {
      const eventId = `move_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await pool.query(
        'INSERT INTO movement_events (id, rider_id, event_type, message, metadata) VALUES (?, ?, ?, ?, ?)',
        [
          eventId, 
          id, 
          is_on_duty ? 'duty_on' : 'duty_off', 
          is_on_duty ? `Rider toggled duty ON` : `Rider toggled duty OFF ${reason ? '(Handover)' : ''}`,
          reason ? JSON.stringify({ handover_reason: reason }) : null
        ]
      );
    } catch (logErr) {
      console.error('Failed to log movement event:', logErr);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Duty toggle failed' });
  }
});

// DEV SIMULATOR: Reset Morning Shift (Development Only)
router.post('/dev/simulate-reset', async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production' && !req.query.force_dev) {
    return res.status(403).json({ error: 'Simulator only available in development' });
  }

  try {
    console.log('🚀 DEV: Resetting today\'s attendance logs...');
    await pool.query('DELETE FROM attendance_logs WHERE date = CURDATE()');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

// DEV SIMULATOR: Auto-Sweep trigger (Development Only)
router.post('/dev/simulate-sweep', async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production' && !req.query.force_dev) {
    return res.status(403).json({ error: 'Simulator only available in development' });
  }

  try {
    const io = req.app.get('io');
    console.log('🚀 DEV: Manually triggering Auto-Off Sweep simulation...');
    
    // Logic: Find On-Duty riders with 0 active tasks and turn them off
    const [riders]: any = await pool.query(`
      SELECT u.id, u.name FROM users u
      WHERE u.role = 'rider' AND u.is_on_duty = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM delivery_requests 
        WHERE assigned_rider_id = u.id 
        AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')
      )
    `);

    for (const rider of riders) {
      await pool.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [rider.id]);
      await pool.query(
        'UPDATE attendance_logs SET off_duty_time = NOW() WHERE rider_id = ? AND date = CURDATE()',
        [rider.id]
      ).catch(e => console.error('[SimSweep] Failed to log off_duty_time:', e));

      io.to(rider.id).emit('dev-simulate', { 
        type: 'AUTO_OFF', 
        message: 'Your shift has been automatically ended by the system (Simulation).' 
      });
    }

    res.json({ success: true, riders_processed: riders.length });
  } catch (error) {
    res.status(500).json({ error: 'Simulation sweep failed' });
  }
});

// DELETE /attendance/:riderId (Admin only) - Clear absence for today
router.delete('/attendance/:riderId', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { riderId } = req.params;
    const io = req.app.get('io');
    
    await pool.query('DELETE FROM attendance_logs WHERE rider_id = ? AND date = CURDATE()', [riderId]);
    
    // Notify the mobile app to refresh instantly
    io.to(riderId).emit('attendance-cleared', { message: 'Your absence has been cleared by Admin. You can now start your shift.' });
    io.to(riderId).emit('attendance-updated', { status: null });

    // Broadcast to other admins to refresh their live data
    io.to('admin-room').emit('notification-added', {
      id: `clear_att_${Date.now()}`,
      message: `Rider attendance cleared for ${riderId}`,
      type: 'info'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear attendance' });
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
    const { lat, lng, requestId, heading, accuracy, timestamp, isSimulation, batteryLevel, networkType } = req.body || {};
    const user = req.user! as any;
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
      isSimulation,
      batteryLevel,
      networkType,
      riderName: user.name,
      verifyAssignment: true,
      presenceSocketId: 'background-rest',
      refreshPresence: true,
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
