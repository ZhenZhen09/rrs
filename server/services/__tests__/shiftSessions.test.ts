import { beforeEach, describe, expect, it, vi } from 'vitest';
const { buildLegacyShiftSessionRows, migrate } = require('../../../scripts/migrate-shift-sessions.cjs');
import { getCurrentShiftSession, getShiftSessionsForDate, startShiftSession, endShiftSession } from '../shiftSessions';

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
