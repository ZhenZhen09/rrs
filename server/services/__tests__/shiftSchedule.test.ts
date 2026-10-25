import { describe, expect, it, vi } from 'vitest';
import { ensureShiftScheduleTables, evaluateShiftWindow, getPhilippineDateTime } from '../shiftSchedule';

describe('shift schedule boundary', () => {
  it('uses Philippine time and closes at the exact end minute', () => {
    const before = getPhilippineDateTime(new Date('2026-10-22T10:59:59Z'));
    const atEnd = getPhilippineDateTime(new Date('2026-10-22T11:00:00Z'));
    expect(before).toEqual({ date: '2026-10-22', time: '18:59' });
    expect(evaluateShiftWindow(before.time, '08:00', '19:00')).toBe('open');
    expect(evaluateShiftWindow(atEnd.time, '08:00', '19:00')).toBe('ended');
    expect(evaluateShiftWindow('07:59', '08:00', '19:00')).toBe('early');
  });
});

describe('attendance auto-absence schema', () => {
  it('adds all audit fields when none exist', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('information_schema.COLUMNS')) return [[]];
      return [[]];
    });

    await ensureShiftScheduleTables({ query } as any);

    const alters = query.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql.startsWith('ALTER TABLE attendance_logs'));
    expect(alters).toHaveLength(4);
    expect(alters.join('\n')).toContain('absence_source');
    expect(alters.join('\n')).toContain('auto_absent_at');
    expect(alters.join('\n')).toContain('late_checkin_approved_by');
    expect(alters.join('\n')).toContain('late_checkin_approved_at');
  });

  it('adds only missing audit fields when startup is repeated after a partial migration', async () => {
    const existing = new Set(['absence_source', 'auto_absent_at']);
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('information_schema.COLUMNS')) return [[...existing].map((COLUMN_NAME) => ({ COLUMN_NAME }))];
      const addedColumn = sql.match(/ALTER TABLE attendance_logs ADD COLUMN ([a-z_]+)/)?.[1];
      if (addedColumn) existing.add(addedColumn);
      return [[]];
    });

    await ensureShiftScheduleTables({ query } as any);
    await ensureShiftScheduleTables({ query } as any);

    const alters = query.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql.startsWith('ALTER TABLE attendance_logs'));
    expect(alters).toHaveLength(2);
    expect(alters.some((sql) => sql.includes('late_checkin_approved_by'))).toBe(true);
    expect(alters.some((sql) => sql.includes('late_checkin_approved_at'))).toBe(true);
  });
});
