import { describe, expect, it } from 'vitest';
import { getRiderAvailability, isScheduledForToday, resolveRiderOnlineState } from '../riderAvailability';

describe('rider availability', () => {
  it('allows an online on-duty rider with no same-day attendance report', () => {
    expect(getRiderAvailability({ is_online: true, is_on_duty: true, attendance_status: null }, true))
      .toEqual({ eligible: true, notice: 'NO REPORT' });
  });

  it.each(['absent', 'on_leave'] as const)('blocks a same-day rider with attendance status %s', (attendance_status) => {
    expect(getRiderAvailability({ is_online: true, is_on_duty: true, attendance_status }, true).eligible).toBe(false);
  });

  it('blocks same-day riders who are offline or off duty', () => {
    expect(getRiderAvailability({ is_online: false, is_on_duty: true, attendance_status: 'present' }, true))
      .toEqual({ eligible: false, blockReason: 'OFFLINE' });
    expect(getRiderAvailability({ is_online: true, is_on_duty: false, attendance_status: 'present' }, true))
      .toEqual({ eligible: false, blockReason: 'OFF-DUTY' });
  });

  it('keeps the no-report notice visible when another same-day rule blocks assignment', () => {
    expect(getRiderAvailability({ is_online: false, is_on_duty: true, attendance_status: null }, true))
      .toEqual({ eligible: false, blockReason: 'OFFLINE', notice: 'NO REPORT' });
  });

  it('ignores today attendance, presence, and duty for a future task', () => {
    expect(getRiderAvailability({ is_online: false, is_on_duty: false, attendance_status: 'on_leave' }, false))
      .toEqual({ eligible: true });
  });

  it('uses explicit socket presence before the API value', () => {
    expect(resolveRiderOnlineState('offline', true)).toBe(false);
    expect(resolveRiderOnlineState('online', false)).toBe(true);
    expect(resolveRiderOnlineState(undefined, true)).toBe(true);
  });

  it('compares task dates using the Philippine calendar day', () => {
    const beforeMidnightUtcButTomorrowInManila = new Date('2026-10-08T16:30:00.000Z');
    expect(isScheduledForToday('2026-10-09', beforeMidnightUtcButTomorrowInManila)).toBe(true);
    expect(isScheduledForToday('2026-10-08', beforeMidnightUtcButTomorrowInManila)).toBe(false);
  });
});
