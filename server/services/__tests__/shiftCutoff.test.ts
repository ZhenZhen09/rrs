import { describe, expect, it, vi } from 'vitest';
import { reconcileDueAutoAbsences, reconcileRiderCutoff } from '../shiftCutoff';

describe('scheduled shift cutoff', () => {
  it('closes an open shift at 19:00 with unfinished tasks and is safe to retry', async () => {
    let open = true;
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: 'rider-1' }]];
      if (sql.includes("session_state = 'open'")) return [open ? [{ id: 'shift-1', rider_id: 'rider-1', start_time: '2026-10-22 08:00:00' }] : []];
      if (sql.includes('FROM shift_schedule_revisions')) return [[{ start_time: '08:00', end_time: '19:00', effective_date: '2026-10-22' }]];
      if (sql.includes('SELECT request_id FROM delivery_requests')) return [[{ request_id: 'job-1' }]];
      if (sql.includes('UPDATE shift_sessions')) open = false;
      return [[]];
    });
    const conn = { query, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
    const db = { getConnection: vi.fn(async () => conn), query: vi.fn(async () => [open ? [{ id: 'shift-1' }] : []]) };

    expect(await reconcileRiderCutoff(db as any, 'rider-1', new Date('2026-10-22T11:05:00Z'))).toBeTruthy();
    expect(await reconcileRiderCutoff(db as any, 'rider-1', new Date('2026-10-22T11:06:00Z'))).toBeNull();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("end_source='scheduled'"), expect.arrayContaining(['2026-10-22 19:00:00', 1, 'shift-1']));
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE attendance_logs'), ['2026-10-22 19:00:00', 'rider-1', '2026-10-22']);
  });
});

describe('weekday automatic absence reconciliation', () => {
  function makeDb(date: string, existingAttendance: { status: string } | null = null, scheduleExists = true, graceMinutes = 15) {
    let inserted = false;
    let attendanceRow = existingAttendance;
    const connectionQuery = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: 'rider-1' }]];
      if (sql.includes('SELECT status FROM attendance_logs')) return [attendanceRow ? [attendanceRow] : []];
      if (sql.includes('INSERT INTO attendance_logs')) {
        inserted = true;
        attendanceRow = { status: 'absent' };
      }
      return [[]];
    });
    const conn = {
      query: connectionQuery,
      beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM shift_schedule_revisions')) return [scheduleExists ? [{ effective_date: date, start_time: '08:00', end_time: '19:00', grace_minutes: graceMinutes }] : []];
      if (sql.includes("FROM users WHERE role = 'rider'")) return [[{ id: 'rider-1', name: 'Riley' }]];
      return [[]];
    });
    return { db: { query, getConnection: vi.fn(async () => conn) }, query, connectionQuery, conn, inserted: () => inserted };
  }

  it('does not mark absent before the 15-minute grace period expires', async () => {
    const fixture = makeDb('2026-10-22');

    const count = await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:14:59Z'));

    expect(count).toBe(0);
    expect(fixture.db.getConnection).not.toHaveBeenCalled();
  });

  it('does not mark riders absent when no effective shift schedule exists', async () => {
    const fixture = makeDb('2026-10-22', null, false);

    const count = await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:15:00Z'));

    expect(count).toBe(0);
    expect(fixture.db.getConnection).not.toHaveBeenCalled();
  });

  it('records an automatic absence at exactly 8:15 AM Manila time', async () => {
    const fixture = makeDb('2026-10-22');

    const count = await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:15:00Z'));

    expect(count).toBe(1);
    expect(fixture.connectionQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO attendance_logs'),
      expect.arrayContaining(['rider-1', '2026-10-22', '2026-10-22 08:15:00']),
    );
  });

  it('uses the configured grace period when recording automatic absence', async () => {
    const fixture = makeDb('2026-10-22', null, true, 30);

    const count = await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:29:59Z'));
    expect(count).toBe(0);

    const dueCount = await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:30:00Z'));
    expect(dueCount).toBe(1);
    expect(fixture.connectionQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO attendance_logs'), expect.arrayContaining([
      expect.stringContaining('30-minute shift-start grace period'),
    ]));
  });

  it.each([
    ['Saturday', '2026-10-24', '2026-10-24T00:15:00Z'],
    ['Sunday', '2026-10-25', '2026-10-25T00:15:00Z'],
  ])('skips %s even after the grace period', async (_day, date, now) => {
    const fixture = makeDb(date);

    const count = await reconcileDueAutoAbsences(fixture.db as any, new Date(now));

    expect(count).toBe(0);
    expect(fixture.db.getConnection).not.toHaveBeenCalled();
  });

  it.each([
    ['present', 'prior check-in'],
    ['absent', 'existing manual absence'],
    ['on_leave', 'approved leave'],
  ])('preserves an existing %s attendance row (%s)', async (status) => {
    const fixture = makeDb('2026-10-22', { status });

    const count = await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:15:00Z'));

    expect(count).toBe(0);
    expect(fixture.inserted()).toBe(false);
    expect(fixture.conn.commit).toHaveBeenCalled();
  });

  it('uses a unique rider/date insert and is safe across repeated worker ticks', async () => {
    const fixture = makeDb('2026-10-22');

    await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:15:00Z'));
    await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:16:00Z'));

    expect(fixture.connectionQuery.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toHaveLength(1);
  });

  it('notifies the admin dashboard and rider after the automatic absence commits', async () => {
    const fixture = makeDb('2026-10-22');
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) };

    await reconcileDueAutoAbsences(fixture.db as any, new Date('2026-10-22T00:15:00Z'), io as any);

    expect(fixture.conn.commit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith('attendance-updated', expect.objectContaining({ status: 'absent', absence_source: 'automatic_no_show' }));
    expect(emit).toHaveBeenCalledWith('notification-added', expect.objectContaining({ type: 'warning' }));
  });
});
