import { isOutsideShiftHours } from '../shiftHours';

describe('offline shift cutoff', () => {
  it('locks at 19:00 Philippine time even when the phone time zone differs', () => {
    const schedule = { date: '2026-10-22', start_time: '08:00', end_time: '19:00' };
    expect(isOutsideShiftHours(schedule, new Date('2026-10-22T10:59:00Z'))).toBe(false);
    expect(isOutsideShiftHours(schedule, new Date('2026-10-22T11:00:00Z'))).toBe(true);
  });
});
