import { Router, Response } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import * as argon2 from 'argon2';
import { onlineRiders } from '../presence';
import { AuthRequest, authorize } from '../middleware/auth';
import fs from 'fs';
import { handleRiderLocationUpdate } from '../locationTracking';
import { recordConnectivityLog } from '../services/connectivityLogger';
import { ensureLocationEventReceiptsTable } from '../services/locationEventReceipts';
import { endShiftSession, getCurrentShiftSession, getShiftSessionsForDate, setNonPresentAttendance, setRiderAvailability, ShiftSessionError, startShiftSession } from '../services/shiftSessions';
import { getDefaultRiderAvatarId, isRiderAvatarId } from '../services/riderAvatarCatalog';
import { ensureRiderAvatarPreferencesTable, saveRiderAvatarPreference } from '../services/riderAvatarPreferences';

const router = Router();
const PH_TODAY_SQL = "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00'))";
const PH_NOW_SQL = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')";

const getPhilippineDateString = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

// Get all users (Admin only)
router.get('/', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    await ensureRiderAvatarPreferencesTable();
    const [rows]: any = await pool.query("SELECT u.id, u.email, u.name, u.role, u.department, u.status, u.created_at, u.updated_at, u.last_password_change, u.require_password_reset, u.mfa_enabled, rap.avatar_id AS saved_avatar_id FROM users u LEFT JOIN rider_avatar_preferences rap ON rap.user_id COLLATE utf8mb4_general_ci = u.id COLLATE utf8mb4_general_ci");
    const debugInfo = `[DEBUG ${new Date().toISOString()}] Fetched ${rows.length} users. First row keys: ${Object.keys(rows[0] || {}).join(', ')}\nSample data: ${JSON.stringify(rows[0])}\n`;
    fs.appendFileSync('api_debug.log', debugInfo);
    res.json(rows.map((row: any) => { const { saved_avatar_id, ...user } = row; return { ...user, avatar_id: saved_avatar_id || getDefaultRiderAvatarId(String(row.id)) }; }));
  } catch (error: any) {
    fs.appendFileSync('api_debug.log', `[ERROR] ${error.message}\n`);
    res.status(500).json({ error: 'Database error' });
  }
});

// Manual MFA reset (Admin only)
router.post('/:id/reset-mfa', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const [result]: any = await pool.query('UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'MFA reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset MFA' });
  }
});

// Get all riders
router.patch('/me/avatar', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  const avatarId = req.body?.avatar_id;
  if (!isRiderAvatarId(avatarId)) return res.status(400).json({ error: 'Invalid avatar ID' });

  try {
    await saveRiderAvatarPreference(String(req.user!.id), avatarId);
    req.app.get('io')?.to('admin-room').emit('rider-status-updated', {
      riderId: req.user!.id,
      type: 'avatar',
      avatar_id: avatarId,
    });
    return res.json({ avatar_id: avatarId });
  } catch (error) {
    return res.status(500).json({ error: 'Avatar update failed' });
  }
});

router.get('/riders', authorize(['admin', 'personnel']), async (req: AuthRequest, res: Response) => {
  try {
    await ensureRiderAvatarPreferencesTable();
    const [rows] = await pool.query("SELECT u.id, u.name, u.email, u.role, rap.avatar_id AS saved_avatar_id FROM users u LEFT JOIN rider_avatar_preferences rap ON rap.user_id COLLATE utf8mb4_general_ci = u.id COLLATE utf8mb4_general_ci WHERE u.role = 'rider'");
    res.json((rows as any[]).map((row) => { const { saved_avatar_id, ...rider } = row; return { ...rider, avatar_id: saved_avatar_id || getDefaultRiderAvatarId(String(row.id)) }; }));
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get LIVE riders (for Map)
router.get('/riders/live', authorize(['admin', 'personnel']), async (req: AuthRequest, res: Response) => {
  try {
    await ensureRiderAvatarPreferencesTable();
    // Fetch all riders and their latest info, ensuring unique riders via GROUP BY
    // to prevent duplicate key warnings in the frontend when a rider has multiple active tasks.
    const [rows]: any = await pool.query(`
      SELECT u.id, u.name, u.email, u.status as user_status, u.current_lat, u.current_lng,
             u.is_on_duty, u.last_battery_level, u.last_signal_strength,
             rap.avatar_id AS saved_avatar_id,
             MAX(dr.request_id) as request_id, 
             MAX(dr.delivery_status) as delivery_status, 
             MAX(dr.pickup_address) as pickup_address, 
             MAX(dr.time_window) as time_window,
             (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = ${PH_TODAY_SQL} LIMIT 1) as attendance_status
      FROM users u
      LEFT JOIN rider_avatar_preferences rap ON rap.user_id COLLATE utf8mb4_general_ci = u.id COLLATE utf8mb4_general_ci
      LEFT JOIN delivery_requests dr ON u.id = dr.assigned_rider_id 
        AND dr.delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')
      WHERE u.role = 'rider'
      GROUP BY u.id, u.name, u.email, u.status, u.current_lat, u.current_lng,
               u.is_on_duty, u.last_battery_level, u.last_signal_strength, rap.avatar_id
    `);

    const riders = rows.map((r: any) => ({
      ...r,
      avatar_id: r.saved_avatar_id || getDefaultRiderAvatarId(String(r.id)),
      is_online: onlineRiders.has(r.id),
      last_seen: onlineRiders.get(r.id)?.lastSeen || null
    }));

    res.json(riders);
  } catch (error) {
    console.error('[LIVE RIDERS] Route error:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /attendance/daily (Admin only)
router.get('/attendance/daily', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const date = (req.query.date as string | undefined) || getPhilippineDateString();
    const [rows]: any = await pool.query(`
      SELECT u.id as rider_id, u.name as rider_name, u.email as rider_email,
             al.status, al.reason, al.check_in_time, al.off_duty_time, al.created_at,
             (SELECT COUNT(*) FROM delivery_requests 
              WHERE assigned_rider_id = u.id 
                AND (delivery_date <= ? OR delivery_status = 'in_progress')
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
    const riders = await Promise.all(rows.map(async (row: any) => {
      const summary = await getShiftSessionsForDate(pool, row.rider_id, date);
      return { ...row, sessions: summary.sessions, total_worked_minutes: summary.total_worked_minutes };
    }));
    res.json(riders);
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /me/attendance (Rider only)
router.get('/me/shift-session', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const session = await getCurrentShiftSession(pool, req.user!.id);
    const [users]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [req.user!.id]);
    res.json({ session, is_on_duty: Boolean(users[0]?.is_on_duty) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current shift' });
  }
});

router.get('/me/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT status, reason FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`,
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
    const id = String(req.params.id);
    const { status, reason, operation_id } = req.body;
    const user = req.user! as any;
    const io = req.app.get('io');

    if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
    if (!['present', 'absent', 'on_leave'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    if (status === 'present') {
      if (typeof operation_id !== 'string' || !operation_id.trim()) return res.status(400).json({ error: 'operation_id is required' });
      const session = await startShiftSession(pool, { riderId: id, operationId: operation_id.trim() });
      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
      io.to(id).emit('attendance-updated', { status });
      return res.json({ success: true, session, is_on_duty: !session.end_time });
    }
    await setNonPresentAttendance(pool, { riderId: id, status, reason });

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
    if (error instanceof ShiftSessionError && error.code === 'OPEN_SHIFT') return res.status(409).json({ code: error.code, error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Attendance already logged for today' });
    res.status(500).json({ error: 'Attendance log failed' });
  }
});

// Toggle On-Duty status (Rider only)
router.post('/:id/duty', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const { is_on_duty } = req.body;
  const user = req.user! as any;
  const io = req.app.get('io');
  if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
  if (typeof is_on_duty !== 'boolean') return res.status(400).json({ error: 'Duty status must be true or false' });
  try {
    const result = await setRiderAvailability(pool, { riderId: id, isOnDuty: is_on_duty });
    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'duty', is_on_duty });
    try {
      await recordConnectivityLog({ riderId: String(id), riderName: user.name, eventType: is_on_duty ? 'duty_on' : 'duty_off', isOnDuty: is_on_duty });
    } catch (logError) { console.error('Failed to log duty connectivity event:', logError); }
    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof ShiftSessionError) {
      const status = error.code === 'HANDOVER_REQUIRED' ? 400 : 409;
      return res.status(status).json({ code: error.code, error: error.message });
    }
    console.error('Duty toggle failed:', error);
    return res.status(500).json({ error: 'Duty toggle failed' });
  }
});
// DEV SIMULATOR: Reset Morning Shift (Development Only)
router.post('/dev/simulate-reset', async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production' && !req.query.force_dev) {
    return res.status(403).json({ error: 'Simulator only available in development' });
  }

  try {
    console.log('ðŸš€ DEV: Resetting today\'s attendance logs...');
    await pool.query(`DELETE FROM attendance_logs WHERE date = ${PH_TODAY_SQL}`);
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
    console.log('ðŸš€ DEV: Manually triggering Auto-Off Sweep simulation...');
    
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
      try {
        await endShiftSession(pool, { riderId: rider.id, operationId: `auto_off_${crypto.randomUUID()}`, reason: 'Automatically ended by the system (simulation).' });
        io.to(rider.id).emit('dev-simulate', {
          type: 'AUTO_OFF',
          message: 'Your shift has been automatically ended by the system (Simulation).'
        });
      } catch (sweepError) {
        console.error(`[SimSweep] Failed to close shift for ${rider.id}:`, sweepError);
      }
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
    
    await pool.query(`DELETE FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL}`, [riderId]);
    
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
      console.warn(`âš ï¸ [SECURITY] Rider ${user.id} attempted to log location for unassigned task ${requestId}`);
    }

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Location log failed' });
  }
});

// Batch location upload for offline/restarted mobile tracking sessions.
router.post('/location/batch', async (req: AuthRequest, res: Response) => {
  try {
    await ensureLocationEventReceiptsTable();
    const user = req.user! as any;
    const io = req.app.get('io');
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    if (user.role !== 'rider') return res.status(403).json({ error: 'Forbidden' });
    if (events.length < 1 || events.length > 50) return res.status(400).json({ error: 'Batch must contain between 1 and 50 events' });

    const acceptedEventIds: string[] = [];
    const rejected: Array<{ eventId: string; reason: string }> = [];

    for (const event of events) {
      const eventId = String(event?.eventId || '');
      const riderId = String(event?.riderId || '');
      const requestId = String(event?.requestId || '');
      const sessionId = String(event?.sessionId || '');
      const sequence = Number(event?.sequence);
      const timestamp = Number(event?.capturedAt);
      const lat = Number(event?.latitude);
      const lng = Number(event?.longitude);

      if (!eventId || !sessionId || !requestId || riderId !== user.id || !Number.isInteger(sequence) || sequence < 1 ||
          !Number.isFinite(timestamp) || !Number.isFinite(lat) || !Number.isFinite(lng) ||
          lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
        rejected.push({ eventId: eventId || 'unknown', reason: 'invalid_location_event' });
        continue;
      }

      const [receiptResult]: any = await pool.query(
        `INSERT IGNORE INTO location_event_receipts
          (event_id, session_id, request_id, rider_id, sequence_number)
         VALUES (?, ?, ?, ?, ?)`,
        [eventId, sessionId, requestId, riderId, sequence],
      );

      if (receiptResult.affectedRows === 0) {
        acceptedEventIds.push(eventId);
        continue;
      }

      try {
        const result = await handleRiderLocationUpdate({
          riderId,
          requestId,
          lat,
          lng,
          heading: event.heading,
          accuracy: event.accuracyM,
          timestamp,
          batteryLevel: event.batteryLevel,
          networkType: event.networkType,
          riderName: user.name,
          verifyAssignment: true,
          presenceSocketId: 'background-batch',
          refreshPresence: true,
          io,
        });

        if (result.reason === 'invalid_location' || result.reason === 'low_accuracy' || result.reason === 'stale_location' || result.reason === 'not_assigned') {
          await pool.query('DELETE FROM location_event_receipts WHERE event_id = ?', [eventId]);
          rejected.push({ eventId, reason: result.reason });
          continue;
        }

        acceptedEventIds.push(eventId);
      } catch (error) {
        await pool.query('DELETE FROM location_event_receipts WHERE event_id = ?', [eventId]);
        throw error;
      }
    }

    res.json({ acceptedEventIds, rejected });
  } catch (error) {
    console.error('Batch location upload failed:', error);
    res.status(500).json({ error: 'Batch location upload failed' });
  }
});

router.post('/:id/shift/end', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const { operation_id, reason } = req.body;
  const user = req.user! as any;
  const io = req.app.get('io');
  if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
  if (typeof operation_id !== 'string' || !operation_id.trim()) return res.status(400).json({ error: 'operation_id is required' });

  try {
    const session = await endShiftSession(pool, { riderId: id, operationId: operation_id.trim(), reason });
    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'shift', is_on_duty: false });
    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'duty', is_on_duty: false });
    if (session.active_task_count_at_end) {
      io.to('admin-room').emit('notification-added', {
        id: `notif_handover_${Date.now()}`,
        message: `Rider ${user.name} ended a shift with ${session.active_task_count_at_end} unfinished task(s). Reason: ${session.handover_reason}`,
        type: 'warning'
      });
    }
    try {
      await recordConnectivityLog({ riderId: String(id), riderName: user.name, eventType: 'duty_off', isOnDuty: false, metadata: session.handover_reason ? { handover_reason: session.handover_reason, active_task_count: session.active_task_count_at_end } : null });
    } catch (logError) { console.error('Failed to log shift end connectivity:', logError); }
    return res.json({ success: true, session, is_on_duty: false });
  } catch (error: any) {
    if (error instanceof ShiftSessionError) {
      const status = error.code === 'HANDOVER_REQUIRED' ? 400 : 409;
      return res.status(status).json({ code: error.code, error: error.message });
    }
    console.error('Shift end failed:', error);
    return res.status(500).json({ error: 'Shift end failed' });
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
