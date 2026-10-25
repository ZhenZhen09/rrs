import { Router, Response } from 'express';
import { pool } from '../db';
import { AuthRequest, authorize } from '../middleware/auth';
import { logAction } from '../services/auditLogger';
import { getAutomaticShiftCloseSetting, getPendingSchedule, getPhilippineDateTime, getScheduleForDate, saveNextDaySchedule, setAutomaticShiftCloseSetting } from '../services/shiftSchedule';

const router = Router();
router.use(authorize(['admin']));
let automaticShiftCloseToggleLock: Promise<void> = Promise.resolve();

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const date = getPhilippineDateTime(new Date()).date;
    const [current, pending] = await Promise.all([getScheduleForDate(pool, date), getPendingSchedule(pool, date)]);
    const automaticShiftClose = await getAutomaticShiftCloseSetting(pool);
    res.json({ date, time_zone: 'Asia/Manila', current, pending, automatic_shift_close: automaticShiftClose, default_end_time: '19:00' });
  } catch (error) {
    console.error('Shift schedule read failed:', error);
    res.status(500).json({ error: 'Failed to load shift hours' });
  }
});

router.put('/automatic-close', async (req: AuthRequest, res: Response) => {
  const enabled = req.body?.enabled;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });
  let release!: () => void;
  const previousLock = automaticShiftCloseToggleLock;
  automaticShiftCloseToggleLock = new Promise<void>(resolve => { release = resolve; });
  await previousLock;
  try {
    const previous = await getAutomaticShiftCloseSetting(pool);
    if (previous.enabled !== enabled) {
      const setting = await setAutomaticShiftCloseSetting(pool, enabled, String(req.user!.id));
      await logAction({ actor_id: req.user!.id, actor_role: 'admin', action: 'automatic_shift_close_toggled',
        resource_type: 'system_setting', resource_id: 'automatic_shift_close_enabled', old_values: previous,
        new_values: setting, ip_address: req.ip, user_agent: req.get('user-agent') || undefined });
      return res.json({ success: true, automatic_shift_close: setting });
    }
    res.json({ success: true, automatic_shift_close: previous });
  } catch (error) {
    console.error('Automatic shift close setting update failed:', error);
    res.status(500).json({ error: 'Failed to update automatic shift close setting' });
  } finally {
    release();
  }
});

router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const { start_time, end_time, grace_minutes } = req.body || {};
    const date = getPhilippineDateTime(new Date()).date;
    const previous = await getPendingSchedule(pool, date);
    const saved = await saveNextDaySchedule(pool, req.user!.id, start_time, end_time, grace_minutes ?? 15);
    await logAction({ actor_id: req.user!.id, actor_role: 'admin', action: 'shift_schedule_updated',
      resource_type: 'shift_schedule', resource_id: saved.effective_date,
      old_values: previous, new_values: saved });
    res.json({ success: true, schedule: saved, time_zone: 'Asia/Manila' });
  } catch (error: any) {
    if (error?.message?.includes('Start time must be before') || error?.message?.includes('Grace period')) return res.status(400).json({ error: error.message });
    console.error('Shift schedule save failed:', error);
    res.status(500).json({ error: 'Failed to save shift hours' });
  }
});

router.get('/cutoff-review', async (req: AuthRequest, res: Response) => {
  try {
    const date = String(req.query.date || getPhilippineDateTime(new Date()).date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date' });
    const [rows] = await pool.query(`SELECT ss.id AS session_id, ss.rider_id, u.name AS rider_name,
      ss.end_time, ss.active_task_count_at_end,
      (SELECT COUNT(*) FROM delivery_requests dr WHERE dr.assigned_rider_id=ss.rider_id
        AND dr.status='approved' AND COALESCE(dr.delivery_status,'') NOT IN ('completed','delivered','failed','cancelled','disapproved')) AS current_active_tasks
      FROM shift_sessions ss JOIN users u ON u.id=ss.rider_id
      WHERE DATE(ss.start_time)=? AND ss.end_source='scheduled' AND ss.active_task_count_at_end>0
      ORDER BY ss.end_time DESC`, [date]);
    res.json({ date, riders: rows });
  } catch (error) {
    console.error('Cutoff review read failed:', error);
    res.status(500).json({ error: 'Failed to load cutoff review' });
  }
});

export default router;
