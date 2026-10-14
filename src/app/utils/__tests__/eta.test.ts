import { describe, expect, it } from 'vitest';
import { formatDuration, formatOverdueDuration, getEtaStatus } from '../eta';

describe('delivery ETA helpers', () => {
  it('rounds a route duration up to a rider-friendly minute label', () => {
    expect(formatDuration(0)).toBe('Less than 1 min');
    expect(formatDuration(61)).toBe('2 min');
    expect(formatDuration(3660)).toBe('1 hr 1 min');
  });

  it('formats overdue durations over an hour as hours and remaining minutes', () => {
    expect(formatOverdueDuration(803)).toBe('13 hr 23 min');
  });

  it('marks a fresh in-progress estimate as available', () => {
    expect(getEtaStatus({
      deliveryStatus: 'in_progress',
      currentLocationAt: 9_950,
      calculatedAt: 9_900,
      nowMs: 10_000,
      freshnessLimitMs: 180_000,
    })).toBe('available');
  });

  it('marks a missing or stale location as unavailable or stale', () => {
    expect(getEtaStatus({ deliveryStatus: 'in_progress', nowMs: 10_000, freshnessLimitMs: 180_000 })).toBe('unavailable');
    expect(getEtaStatus({
      deliveryStatus: 'in_progress',
      currentLocationAt: 1,
      calculatedAt: 1,
      nowMs: 200_000,
      freshnessLimitMs: 180_000,
    })).toBe('stale');
  });

  it('marks terminal delivery states as completed', () => {
    expect(getEtaStatus({ deliveryStatus: 'completed', nowMs: 10_000, freshnessLimitMs: 180_000 })).toBe('completed');
  });
});
