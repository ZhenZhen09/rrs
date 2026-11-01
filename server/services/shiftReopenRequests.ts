import crypto from 'crypto';
import { getPhilippineDateTime, getShiftPolicy } from './shiftSchedule';

type Db = { query: (sql: string, values?: any[]) => Promise<any>; getConnection: () => Promise<any> };
const TODAY = "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00'))";

export type ShiftReopenStatus = 'pending' | 'approved' | 'rejected' | 'used';

export class ShiftReopenRequestError extends Error {
  constructor(public code: 'NOT_ELIGIBLE' | 'NOT_FOUND' | 'ALREADY_REVIEWED', message: string) { super(message); }
}

async function transition<T>(db: Db, riderId: string, action: (conn: any) => Promise<T>): Promise<T> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [riders] = await conn.query('SELECT id FROM users WHERE id=? FOR UPDATE', [riderId]);
    if (!riders[0]) throw new ShiftReopenRequestError('NOT_FOUND', 'Rider not found.');
    const result = await action(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function getCurrentShiftReopenRequest(db: Db, riderId: string) {
  const [rows] = await db.query(`SELECT request_id, status, reason, review_note, requested_at, reviewed_at
    FROM shift_reopen_requests WHERE rider_id=? AND work_date=${TODAY}
    ORDER BY requested_at DESC LIMIT 1`, [riderId]);
  return (rows as any[])[0] || null;
}

export async function createShiftReopenRequest(db: Db, input: { riderId: string; reason: string }) {
  return transition(db, input.riderId, async (conn) => {
    const [opened] = await conn.query("SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='open' LIMIT 1 FOR UPDATE", [input.riderId]);
    const [ended] = await conn.query(`SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='closed'
      AND end_source='manual' AND DATE(start_time)=${TODAY} LIMIT 1 FOR UPDATE`, [input.riderId]);
    const [attendance] = await conn.query(`SELECT status FROM attendance_logs WHERE rider_id=? AND date=${TODAY} LIMIT 1 FOR UPDATE`, [input.riderId]);
    if (opened[0] || !ended[0] || attendance[0]?.status !== 'present') {
      throw new ShiftReopenRequestError('NOT_ELIGIBLE', 'A reopen request is available only after you manually end today’s checked-in shift.');
    }
    const [existing] = await conn.query(`SELECT request_id, status, reason, review_note, requested_at, reviewed_at
      FROM shift_reopen_requests WHERE rider_id=? AND work_date=${TODAY}
      ORDER BY requested_at DESC LIMIT 1 FOR UPDATE`, [input.riderId]);
    if (existing[0]?.status === 'pending' || existing[0]?.status === 'approved') {
      return { request: existing[0], created: false };
    }
    const requestId = `reopen_${crypto.randomUUID()}`;
    await conn.query(`INSERT INTO shift_reopen_requests (request_id,rider_id,work_date,reason,status)
      VALUES (?, ?, ${TODAY}, ?, 'pending')`, [requestId, input.riderId, input.reason]);
    const [created] = await conn.query(`SELECT request_id, status, reason, review_note, requested_at, reviewed_at
      FROM shift_reopen_requests WHERE request_id=?`, [requestId]);
    return { request: created[0], created: true };
  });
}

export async function reviewShiftReopenRequest(db: Db, input: { requestId: string; adminId: string; decision: 'approved' | 'rejected'; reviewNote?: string }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT request_id, rider_id, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, status FROM shift_reopen_requests
      WHERE request_id=? LIMIT 1 FOR UPDATE`, [input.requestId]);
    const request = rows[0];
    if (!request) throw new ShiftReopenRequestError('NOT_FOUND', 'Reopen request not found.');
    if (request.status !== 'pending') throw new ShiftReopenRequestError('ALREADY_REVIEWED', 'This reopen request has already been reviewed.');
    if (String(request.work_date).slice(0, 10) !== getPhilippineDateTime(new Date()).date) {
      throw new ShiftReopenRequestError('NOT_ELIGIBLE', 'Only today’s reopen requests can be reviewed.');
    }
    const [openSessions] = await conn.query("SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='open' LIMIT 1 FOR UPDATE", [request.rider_id]);
    const [manualEnds] = await conn.query(`SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='closed' AND end_source='manual' AND DATE(start_time)=${TODAY} LIMIT 1 FOR UPDATE`, [request.rider_id]);
    if (openSessions[0] || !manualEnds[0]) throw new ShiftReopenRequestError('NOT_ELIGIBLE', 'The rider’s shift state changed. Refresh attendance and review again if needed.');
    if (input.decision === 'approved') {
      const policy = await getShiftPolicy(conn, request.rider_id);
      if (!policy.active || !policy.canWork) throw new ShiftReopenRequestError('NOT_ELIGIBLE', 'The rider’s shift hours have ended. This request can no longer be approved.');
    }
    await conn.query(`UPDATE shift_reopen_requests SET status=?, review_note=?, reviewed_by=?, reviewed_at=CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')
      WHERE request_id=? AND status='pending'`, [input.decision, input.reviewNote?.trim() || null, input.adminId, input.requestId]);
    const [updated] = await conn.query(`SELECT request_id, rider_id, status, reason, review_note, requested_at, reviewed_at, reviewed_by
      FROM shift_reopen_requests WHERE request_id=?`, [input.requestId]);
    await conn.commit();
    return updated[0];
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function consumeApprovedShiftReopenRequest(conn: any, riderId: string) {
  const [rows] = await conn.query(`SELECT request_id FROM shift_reopen_requests
    WHERE rider_id=? AND work_date=${TODAY} AND status='approved'
    ORDER BY reviewed_at DESC LIMIT 1 FOR UPDATE`, [riderId]);
  if (!rows[0]) return false;
  await conn.query(`UPDATE shift_reopen_requests SET status='used'
    WHERE request_id=? AND status='approved'`, [rows[0].request_id]);
  return true;
}
