import { describe, expect, it } from 'vitest';
import { getProactiveOverdueMetadata, getScheduledEndAt } from '../overdue';

const baseRequest = {
  delivery_date: '2026-10-06',
  time_window: '09:00 - 10:00',
  status: 'approved',
  delivery_status: 'assigned',
};

describe('proactive overdue metadata', () => {
  it('keeps a task Normal before the warning threshold', () => {
    expect(getProactiveOverdueMetadata(baseRequest, new Date('2026-10-06T01:29:00Z'), 30).state).toBe('Normal');
  });

  it('marks a task At Risk at the warning threshold', () => {
    expect(getProactiveOverdueMetadata(baseRequest, new Date('2026-10-06T01:30:00Z'), 30)).toMatchObject({
      state: 'At Risk', remaining_minutes: 30, overdue_minutes: 0,
    });
  });

  it('does not mark a task overdue exactly at its deadline', () => {
    expect(getProactiveOverdueMetadata(baseRequest, new Date('2026-10-06T02:00:00Z'), 30)).toMatchObject({
      state: 'At Risk', remaining_minutes: 0, overdue_minutes: 0,
    });
  });

  it('marks a task overdue after its deadline', () => {
    expect(getProactiveOverdueMetadata(baseRequest, new Date('2026-10-06T02:01:00Z'), 30)).toMatchObject({
      state: 'Overdue', remaining_minutes: 0, overdue_minutes: 1,
    });
  });

  it('never marks a completed task overdue', () => {
    expect(getProactiveOverdueMetadata({ ...baseRequest, delivery_status: 'completed' }, new Date('2026-10-06T03:00:00Z'), 30).state).toBe('Normal');
  });

  it('combines a delivery date with the end of the time window in Philippine time', () => {
    expect(getScheduledEndAt('2026-10-06', '09:00 - 10:00')).toBe('2026-10-06T10:00:00+08:00');
  });
});
