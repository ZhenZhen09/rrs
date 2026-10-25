import { beforeEach, describe, expect, it, vi } from 'vitest';
const { buildLegacyShiftSessionRows, migrate } = require('../../../scripts/migrate-shift-sessions.cjs');
import { approveLateCheckIn, getCurrentShiftSession, getShiftSessionsForDate, startShiftSession, endShiftSession, setRiderAvailability } from '../shiftSessions';

describe('legacy shift session backfill rows', () => {
  it('creates deterministic sessions preserving ended and open attendance times', () => {
    const rows = buildLegacyShiftSessionRows([
      { id: 'att-1', rider_id: 'rider-1', status: 'present', date: '2026-10-01', is_on_duty: 0, check_in_time: '2026-10-01 08:00:00', off_duty_time: '2026-10-01 12:00:00' },
      { id: 'att-2', rider_id: 'rider-1', status: 'present', date: '2026-10-01', is_on_duty: 1, check_in_time: '2026-10-01 13:00:00', off_duty_time: null },
    ], '2026-10-05');
    expect(rows).toEqual([
      expect.objectContaining({ id: 'legacy_att-1', source_attendance_id: 'att-1', start_time: '2026-10-01 08:00:00', end_time: '2026-10-01 12:00:00', session_state: 'closed' }),
      expect.objectContaining({ id: 'legacy_att-2', source_attendance_id: 'att-2', start_time: '2026-10-01 13:00:00', end_time: null, session_state: 'legacy_unknown' }),
    ]);
  });

  it('keeps only a same-day legacy shift with rider on duty open', () => {
    const rows = buildLegacyShiftSessionRows([
      { id: 'active-today', rider_id: 'r1', status: 'present', date: '2026-10-05', is_on_duty: 1, check_in_time: '2026-10-05 08:00:00', off_duty_time: null },
      { id: 'stale-today', rider_id: 'r2', status: 'present', date: '2026-10-05', is_on_duty: 0, check_in_time: '2026-10-05 08:00:00', off_duty_time: null },
    ], '2026-10-05');
    expect(rows.map((row: any) => row.session_state)).toEqual(['open', 'legacy_unknown']);
    expect(rows.every((row: any) => row.end_time === null)).toBe(true);
  });

  it('does not backfill absence or leave report timestamps as shift sessions', () => {
    const rows = buildLegacyShiftSessionRows([
      { id: 'absent', rider_id: 'r1', status: 'absent', date: '2026-10-05', is_on_duty: 0, check_in_time: '2026-10-05 08:00:00', off_duty_time: null },
      { id: 'leave', rider_id: 'r2', status: 'on_leave', date: '2026-10-05', is_on_duty: 0, check_in_time: '2026-10-05 08:00:00', off_duty_time: null },
    ], '2026-10-05');
    expect(rows).toEqual([]);
  });

  it('reports legacy end classifications in dry-run without mutating the database', async () => {
    const pool = { query: vi.fn()
      .mockResolvedValueOnce([[{ id: 'old-open', rider_id: 'r1', status: 'present', date: '2026-10-04', is_on_duty: 0, check_in_time: '2026-10-04 08:00:00', off_duty_time: null }]])
      .mockResolvedValueOnce([[{ table_exists: 0 }]])
      .mockResolvedValueOnce([[{ table_exists: 0 }]]) };
    const logger = { log: vi.fn() };
    const result = await migrate(pool as any, { dryRun: true, logger });
    expect(result).toMatchObject({ tableExists: false, receiptTableExists: false, proposed: 1, alreadyBackfilled: 0, wouldInsert: 1, legacy_unknown: 1, dryRun: true });
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('shift_sessions table is missing'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('shift_operation_receipts table is missing'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 end unknown'));
    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls[0][0]).toContain("al.status = 'present'");
  });
});

describe('shift session transitions', () => {
  const conn = { query: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  const db = { getConnection: vi.fn(async () => conn), query: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]] : [[]]);
  });

  it('serializes starts by locking the rider and returns an already open session', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]] : sql.includes('shift_operation_receipts') ? [[]] : sql.includes('SELECT * FROM shift_sessions WHERE rider_id')
      ? [[{ id: 'open-1', rider_id: 'rider-1', end_time: null }]] : [[]]);
    const result = await startShiftSession(db as any, { riderId: 'rider-1', operationId: 'start-1' });
    expect(result.id).toBe('open-1');
    expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), ['rider-1']);
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO shift_operation_receipts'))).toBe(true);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('starts a shift off duty so online availability stays a separate action', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('shift_operation_receipts')
        ? [[]]
        : sql.includes('SELECT * FROM shift_sessions WHERE rider_id')
          ? [[]]
          : sql.includes('SELECT * FROM shift_sessions WHERE id')
            ? [[{ id: 'shift-new', rider_id: 'rider-1', end_time: null }]]
            : [[]]);

    await startShiftSession(db as any, { riderId: 'rider-1', operationId: 'start-off-duty' });

    expect(conn.query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = FALSE WHERE id = ?', ['rider-1']);
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes("'duty_on'"))).toBe(false);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('rejects a late start when automatic absence has no admin approval', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('shift_operation_receipts') ? [[]]
        : sql.includes('SELECT * FROM shift_sessions WHERE rider_id') ? [[]]
          : sql.includes('SELECT id, status, absence_source') ? [[{ id: 'att-1', status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_at: null }]]
            : [[]]);

    await expect(startShiftSession(db as any, { riderId: 'rider-1', operationId: 'late-unapproved' }))
      .rejects.toMatchObject({ code: 'ATTENDANCE_CONFLICT' });
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO shift_sessions'))).toBe(false);
    expect(conn.rollback).toHaveBeenCalledOnce();
  });

  it('converts approved automatic absence to present at the actual check-in and remains off duty', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('shift_operation_receipts') ? [[]]
        : sql.includes('SELECT * FROM shift_sessions WHERE rider_id') ? [[]]
          : sql.includes('SELECT id, status, absence_source')
            ? [[{ id: 'att-1', status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-22 08:20:00' }]]
            : sql.includes('SELECT * FROM shift_sessions WHERE id')
              ? [[{ id: 'shift-new', rider_id: 'rider-1', session_state: 'open', start_time: '2026-10-22 08:25:00' }]]
              : [[]]);

    await startShiftSession(db as any, { riderId: 'rider-1', operationId: 'late-approved' });

    expect(conn.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE attendance_logs SET status='present'"), ['att-1']);
    expect(conn.query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = FALSE WHERE id = ?', ['rider-1']);
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toBe(false);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('approves only a same-day automatic absence and records admin identity', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('SELECT status, absence_source')
        ? [[{ status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_at: null }]]
        : sql.includes('SELECT late_checkin_approved_by')
          ? [[{ late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-22 08:20:00' }]]
          : [[]]);

    await approveLateCheckIn(db as any, { riderId: 'rider-1', date: '2026-10-22', adminId: 'admin-1' }, new Date('2026-10-22T00:20:00Z'));

    expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE attendance_logs SET late_checkin_approved_by=?'), ['admin-1', 'rider-1', '2026-10-22']);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('rejects approval of manual absence and duplicate approval', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('SELECT status, absence_source')
        ? [[{ status: 'absent', absence_source: 'manual', late_checkin_approved_at: null }]]
        : [[]]);

    await expect(approveLateCheckIn(db as any, { riderId: 'rider-1', date: '2026-10-22', adminId: 'admin-1' }, new Date('2026-10-22T00:20:00Z')))
      .rejects.toMatchObject({ code: 'LATE_CHECKIN_NOT_ELIGIBLE' });
    expect(conn.rollback).toHaveBeenCalledOnce();
  });

  it('rejects duplicate approval and approval for a different Philippine date', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('SELECT status, absence_source')
        ? [[{ status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_at: '2026-10-22 08:20:00' }]]
        : [[]]);

    await expect(approveLateCheckIn(db as any, { riderId: 'rider-1', date: '2026-10-22', adminId: 'admin-1' }, new Date('2026-10-22T00:20:00Z')))
      .rejects.toMatchObject({ code: 'LATE_CHECKIN_NOT_ELIGIBLE' });
    await expect(approveLateCheckIn(db as any, { riderId: 'rider-1', date: '2026-10-21', adminId: 'admin-1' }, new Date('2026-10-22T00:20:00Z')))
      .rejects.toMatchObject({ code: 'LATE_CHECKIN_NOT_ELIGIBLE' });
  });

  it('records attendance and opens a shift atomically when the rider goes On Duty', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('SELECT * FROM shift_sessions WHERE rider_id')
        ? [[]]
        : sql.includes('SELECT status FROM attendance_logs')
          ? [[]]
          : sql.includes('SELECT * FROM shift_sessions WHERE id')
            ? [[{ id: 'shift-new', rider_id: 'rider-1', session_state: 'open', start_time: '2026-10-21 09:00:00' }]]
            : [[]]);

    const result = await setRiderAvailability(db as any, { riderId: 'rider-1', isOnDuty: true });

    expect(result).toMatchObject({ is_on_duty: true, session: { id: 'shift-new' } });
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toBe(true);
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO shift_sessions'))).toBe(true);
    expect(conn.query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = ? WHERE id = ?', [true, 'rider-1']);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('rejects On Duty when absence is already recorded without opening a shift', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
      ? [[{ id: 'rider-1' }]]
      : sql.includes('SELECT * FROM shift_sessions WHERE rider_id')
        ? [[]]
        : sql.includes('SELECT status FROM attendance_logs')
          ? [[{ status: 'absent' }]]
          : [[]]);

    await expect(setRiderAvailability(db as any, { riderId: 'rider-1', isOnDuty: true }))
      .rejects.toMatchObject({ code: 'ATTENDANCE_CONFLICT' });
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO shift_sessions'))).toBe(false);
  });

  it('replays a prior start operation even after its shift has ended', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]]
      : sql.includes('shift_operation_receipts') ? [[{ id: 'closed-1', rider_id: 'rider-1', end_time: '2026-10-05 12:00:00' }]] : [[]]);
    const result = await startShiftSession(db as any, { riderId: 'rider-1', operationId: 'start-old' });
    expect(result.id).toBe('closed-1');
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO shift_sessions'))).toBe(false);
  });

  it('replays a completed end operation without writing another end event', async () => {
    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]]
      : sql.includes('shift_operation_receipts') ? [[{ id: 'closed-1', rider_id: 'rider-1', end_time: '2026-10-05 12:00:00' }]] : [[]]);
    const result = await endShiftSession(db as any, { riderId: 'rider-1', operationId: 'end-old' });
    expect(result.id).toBe('closed-1');
    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes("'duty_off'"))).toBe(false);
  });

  it('rejects ending when no session is open and rolls back', async () => {
    await expect(endShiftSession(db as any, { riderId: 'rider-1', operationId: 'end-1' }))
      .rejects.toMatchObject({ code: 'NO_OPEN_SHIFT' });
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
  });

  it('totals only closed sessions and leaves an open session out of the total', async () => {
    db.query.mockResolvedValueOnce([[{ session_state: 'closed', end_time: '12:00', duration_minutes: 240 }, { session_state: 'closed', end_time: '17:00', duration_minutes: 240 }, { session_state: 'open', end_time: null, duration_minutes: null }, { session_state: 'legacy_unknown', end_time: null, duration_minutes: null }]]);
    const summary = await getShiftSessionsForDate(db as any, 'rider-1', '2026-10-05');
    expect(summary.total_worked_minutes).toBe(480);
    expect(summary.sessions).toHaveLength(4);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("session_state = 'closed' AND end_time IS NOT NULL"), ['rider-1', '2026-10-05']);
  });

  it('queries the requested work date and preserves an unknown legacy end time', async () => {
    db.query.mockResolvedValueOnce([[
      { id: 'legacy_att-1', start_time: '2026-10-04 08:00:00', end_time: null, session_state: 'legacy_unknown', duration_minutes: null },
    ]]);
    const summary = await getShiftSessionsForDate(db as any, 'rider-1', '2026-10-04');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DATE(start_time)=?'), ['rider-1', '2026-10-04']);
    expect(summary.sessions[0]).toMatchObject({ session_state: 'legacy_unknown', end_time: null });
    expect(summary.total_worked_minutes).toBe(0);
  });

  it('returns no current session when there is no open row', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await expect(getCurrentShiftSession(db as any, 'rider-1')).resolves.toBeNull();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("session_state = 'open'"), ['rider-1']);
  });
});
