import crypto from 'crypto';
import { pool } from '../db';
import { getAutomaticShiftCloseSetting, getPhilippineDateTime, getScheduleForDate } from './shiftSchedule';

type Db = { query: (sql: string, values?: any[]) => Promise<any>; getConnection: () => Promise<any> };
type RealtimeIo = { to: (room: string) => { emit: (event: string, payload: any) => void } };

function shiftDate(startTime: string): string {
  return String(startTime).slice(0, 10);
}

export async function reconcileRiderCutoff(db: Db, riderId: string, now: Date = new Date()): Promise<any | null> {
  const [candidate] = await db.query("SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='open' LIMIT 1", [riderId]);
  if (!candidate[0]) return null;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [riders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [riderId]);
    if (!riders[0]) { await conn.commit(); return null; }
    const [sessions] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1 FOR UPDATE", [riderId]);
    const session = sessions[0];
    if (!session) { await conn.commit(); return null; }
    const date = shiftDate(session.start_time);
    const schedule = await getScheduleForDate(conn, date);
    if (!schedule) { await conn.commit(); return null; }
    const cutoffAt = `${date} ${schedule.end_time}:00`;
    if (now.getTime() < Date.parse(`${date}T${schedule.end_time}:00+08:00`)) {
      await conn.commit(); return null;
    }

    const [tasks] = await conn.query(`SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ?
      AND status = 'approved' AND COALESCE(delivery_status, '') NOT IN ('completed','delivered','failed','cancelled','disapproved')`, [riderId]);
    const operationId = `scheduled_${session.id}`;
    await conn.query(`UPDATE shift_sessions SET end_time=?, session_state='closed', end_source='scheduled',
      scheduled_cutoff_at=?, end_operation_id=?, handover_reason='Scheduled shift cutoff', active_task_count_at_end=?
      WHERE id=? AND session_state='open'`, [cutoffAt, cutoffAt, operationId, tasks.length, session.id]);
    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [riderId]);
    await conn.query('UPDATE attendance_logs SET off_duty_time=? WHERE rider_id=? AND date=?', [cutoffAt, riderId, date]);
    await conn.query('INSERT INTO shift_operation_receipts (id,rider_id,operation_id,operation_kind,session_id) VALUES (?,?,?,?,?)',
      [`shift_op_${crypto.randomUUID()}`, riderId, operationId, 'end', session.id]);
    await conn.query('INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,?,?,?,?)', [
      `move_${crypto.randomUUID()}`, riderId, 'duty_off', 'Shift ended at scheduled cutoff',
      JSON.stringify({ source: 'scheduled', active_task_count: tasks.length }), cutoffAt,
    ]);
    await conn.commit();
    return { ...session, end_time: cutoffAt, session_state: 'closed', end_source: 'scheduled', active_task_count_at_end: tasks.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function reconcileDueCutoffs(db: Db = pool, now: Date = new Date()): Promise<number> {
  if (!(await getAutomaticShiftCloseSetting(db)).enabled) return 0;
  const [rows] = await db.query("SELECT DISTINCT rider_id FROM shift_sessions WHERE session_state='open'");
  let closed = 0;
  for (const row of rows as Array<{ rider_id: string }>) {
    try {
      if (await reconcileRiderCutoff(db, row.rider_id, now)) closed++;
    } catch (error) {
      console.error(`[SHIFT CUTOFF] Failed for rider ${row.rider_id}:`, error);
    }
  }
  return closed;
}

export async function reconcileDueAutoAbsences(db: Db = pool, now: Date = new Date(), io?: RealtimeIo): Promise<number> {
  const { date } = getPhilippineDateTime(now);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return 0;

  const schedule = await getScheduleForDate(db, date);
  if (!schedule) return 0;
  const deadlineMs = Date.parse(`${date}T${schedule.start_time}:00+08:00`) + Number(schedule.grace_minutes ?? 15) * 60_000;
  if (!Number.isFinite(deadlineMs) || now.getTime() < deadlineMs) return 0;
  const deadlineLocal = getPhilippineDateTime(new Date(deadlineMs));
  const autoAbsentAt = `${deadlineLocal.date} ${deadlineLocal.time}:00`;

  const [riders] = await db.query("SELECT id, name FROM users WHERE role = 'rider'");
  let created = 0;
  for (const rider of riders as Array<{ id: string; name: string }>) {
    let conn: any;
    let shouldNotify = false;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      const [lockedRiders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [rider.id]);
      if (!lockedRiders[0]) { await conn.commit(); continue; }
      const [attendance] = await conn.query(
        'SELECT status FROM attendance_logs WHERE rider_id = ? AND date = ? LIMIT 1 FOR UPDATE',
        [rider.id, date],
      );
      if (attendance[0]) { await conn.commit(); continue; }
      await conn.query(`INSERT INTO attendance_logs
        (id, rider_id, date, status, reason, absence_source, auto_absent_at)
        VALUES (?, ?, ?, 'absent', ?, 'automatic_no_show', ?)`, [
        `att_${crypto.randomUUID()}`, rider.id, date,
        `Automatic no-show after the ${schedule.grace_minutes ?? 15}-minute shift-start grace period.`,
        autoAbsentAt,
      ]);
      await conn.commit();
      created++;
      shouldNotify = true;
    } catch (error: any) {
      await conn.rollback();
      if (error?.code !== 'ER_DUP_ENTRY') {
        console.error(`[AUTO ABSENCE] Failed for rider ${rider.id}:`, error);
      }
    } finally {
      conn?.release();
    }
    if (shouldNotify) {
      const message = `${rider.name || 'Rider'} was automatically marked absent after missing the shift-start grace period.`;
      io?.to('admin-room').emit('notification-added', {
        id: `notif_auto_absent_${rider.id}_${date}`,
        message,
        type: 'warning',
      });
      io?.to('admin-room').emit('rider-status-updated', {
        riderId: rider.id, riderName: rider.name || 'Rider', type: 'attendance',
        status: 'absent', absence_source: 'automatic_no_show', date,
      });
      io?.to(rider.id).emit('attendance-updated', { status: 'absent', absence_source: 'automatic_no_show', date });
    }
  }
  return created;
}

export function startShiftCutoffWorker(db: Db = pool, io?: RealtimeIo): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await reconcileDueCutoffs(db);
      await reconcileDueAutoAbsences(db, new Date(), io);
    }
    catch (error) { console.error('[SHIFT CUTOFF] Worker failed:', error); }
    finally { running = false; }
  };
  void run();
  const timer = setInterval(() => void run(), 60_000);
  return () => clearInterval(timer);
}
