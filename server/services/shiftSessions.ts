import crypto from 'crypto';

type Db = { query: (sql: string, values?: any[]) => Promise<any>; getConnection: () => Promise<any> };
export type ShiftSession = {
  id: string; rider_id: string; start_time: string; end_time: string | null;
  session_state: 'open' | 'closed' | 'legacy_unknown';
  start_operation_id: string | null; end_operation_id: string | null;
  handover_reason: string | null; active_task_count_at_end: number | null;
};
export class ShiftSessionError extends Error {
  constructor(public code: 'NO_OPEN_SHIFT' | 'HANDOVER_REQUIRED' | 'OPEN_SHIFT', message: string) { super(message); }
}
const NOW = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')";
const TODAY = "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00'))";
const activeTaskSql = `SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed','failed','cancelled','disapproved') AND (delivery_date <= ${TODAY} OR delivery_status = 'in_progress')`;

export async function startShiftSession(db: Db, input: { riderId: string; operationId: string }) {
  return transition(db, input.riderId, async (conn) => {
    const [replay] = await conn.query(`SELECT ss.* FROM shift_operation_receipts sr JOIN shift_sessions ss ON ss.id=sr.session_id WHERE sr.rider_id=? AND sr.operation_id=? AND sr.operation_kind='start' LIMIT 1`, [input.riderId, input.operationId]);
    if (replay[0]) return replay[0];
    const [opened] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [input.riderId]);
    if (opened[0]) {
      await recordOperation(conn, input.riderId, input.operationId, 'start', opened[0].id);
      return opened[0];
    }
    const id = `shift_${crypto.randomUUID()}`;
    await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW}) ON DUPLICATE KEY UPDATE check_in_time=IF(status='present',check_in_time,${NOW}), status='present'`, [`att_${crypto.randomUUID()}`, input.riderId]);
    await conn.query('UPDATE users SET is_on_duty = TRUE WHERE id = ?', [input.riderId]);
    await conn.query(`INSERT INTO shift_sessions (id,rider_id,start_time,session_state,start_operation_id) VALUES (?, ?, ${NOW}, 'open', ?)`, [id, input.riderId, input.operationId]);
    await conn.query(`INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,'duty_on','Rider started a shift',NULL,${NOW})`, [`move_${crypto.randomUUID()}`, input.riderId]);
    await recordOperation(conn, input.riderId, input.operationId, 'start', id);
    const [created] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [id]);
    return created[0];
  });
}

export async function setRiderAvailability(db: Db, input: { riderId: string; isOnDuty: boolean }) {
  return transition(db, input.riderId, async (conn) => {
    const [open] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [input.riderId]);
    if (input.isOnDuty && !open[0]) {
      throw new ShiftSessionError('NO_OPEN_SHIFT', 'Start your shift before going online.');
    }

    await conn.query('UPDATE users SET is_on_duty = ? WHERE id = ?', [input.isOnDuty, input.riderId]);
    await conn.query(`INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,?, ?,NULL,${NOW})`, [
      `move_${crypto.randomUUID()}`, input.riderId, input.isOnDuty ? 'duty_on' : 'duty_off',
      input.isOnDuty ? 'Rider went online' : 'Rider went offline',
    ]);
    return { session: open[0] || null, is_on_duty: input.isOnDuty };
  });
}

export async function endShiftSession(db: Db, input: { riderId: string; operationId: string; reason?: string }) {
  return transition(db, input.riderId, async (conn) => {
    const [replay] = await conn.query(`SELECT ss.* FROM shift_operation_receipts sr JOIN shift_sessions ss ON ss.id=sr.session_id WHERE sr.rider_id=? AND sr.operation_id=? AND sr.operation_kind='end' LIMIT 1`, [input.riderId, input.operationId]);
    if (replay[0]) return replay[0];
    const [open] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1 FOR UPDATE", [input.riderId]);
    if (!open[0]) throw new ShiftSessionError('NO_OPEN_SHIFT', 'There is no open shift to end.');
    const [tasks] = await conn.query(activeTaskSql, [input.riderId]);
    const reason = input.reason?.trim() || '';
    if (tasks.length && !reason) throw new ShiftSessionError('HANDOVER_REQUIRED', `Cannot go off duty with ${tasks.length} active tasks. Please provide a handover reason.`);
    await conn.query(`UPDATE shift_sessions SET end_time=${NOW}, session_state='closed', end_operation_id=?, handover_reason=?, active_task_count_at_end=? WHERE id=?`, [input.operationId, reason || null, tasks.length, open[0].id]);
    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    await conn.query(`UPDATE attendance_logs SET off_duty_time=${NOW} WHERE rider_id=? AND date=${TODAY}`, [input.riderId]);
    const metadata = tasks.length || reason ? JSON.stringify({ ...(reason ? { handover_reason: reason } : {}), active_task_count: tasks.length }) : null;
    await conn.query(`INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,'duty_off',?,?,${NOW})`, [`move_${crypto.randomUUID()}`, input.riderId, `Rider toggled duty OFF${tasks.length ? ' (Handover)' : ''}`, metadata]);
    await recordOperation(conn, input.riderId, input.operationId, 'end', open[0].id);
    const [closed] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [open[0].id]);
    return closed[0];
  });
}

export async function setNonPresentAttendance(db: Db, input: { riderId: string; status: 'absent' | 'on_leave'; reason?: string }) {
  return transition(db, input.riderId, async (conn) => {
    const [open] = await conn.query("SELECT id FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' LIMIT 1 FOR UPDATE", [input.riderId]);
    if (open[0]) throw new ShiftSessionError('OPEN_SHIFT', 'End your current shift before changing attendance status.');

    await conn.query(`INSERT INTO attendance_logs (id, rider_id, date, status, reason, check_in_time)
      VALUES (?, ?, ${TODAY}, ?, ?, ${NOW})
      ON DUPLICATE KEY UPDATE check_in_time=IF(status <> ?, ${NOW}, check_in_time), reason=?, status=?`,
    [`att_${crypto.randomUUID()}`, input.riderId, input.status, input.reason || null, input.status, input.reason || null, input.status]);
    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    return { status: input.status };
  });
}

async function recordOperation(conn: any, riderId: string, operationId: string, kind: 'start' | 'end', sessionId: string) {
  await conn.query('INSERT INTO shift_operation_receipts (id,rider_id,operation_id,operation_kind,session_id) VALUES (?,?,?,?,?)', [`shift_op_${crypto.randomUUID()}`, riderId, operationId, kind, sessionId]);
}

async function transition<T>(db: Db, riderId: string, action: (conn: any) => Promise<T>): Promise<T> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [riders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [riderId]);
    if (!riders[0]) throw new Error('Rider not found');
    const result = await action(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function getCurrentShiftSession(db: Db, riderId: string) {
  const [rows] = await db.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [riderId]);
  return rows[0] || null;
}

export async function getShiftSessionsForDate(db: Db, riderId: string, date: string) {
  const [rows] = await db.query(`SELECT *, CASE WHEN session_state = 'closed' AND end_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,start_time,end_time) ELSE NULL END AS duration_minutes FROM shift_sessions WHERE rider_id=? AND DATE(start_time)=? ORDER BY start_time ASC`, [riderId, date]);
  const totalWorkedMinutes = rows.reduce((sum: number, row: any) => sum + (row.session_state === 'closed' && row.end_time ? Number(row.duration_minutes || 0) : 0), 0);
  return { sessions: rows, total_worked_minutes: totalWorkedMinutes };
}
