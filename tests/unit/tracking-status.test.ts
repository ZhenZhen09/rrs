import { describe, it, expect } from 'vitest';

// The logic we want to test (extracted from LiveTrackingDashboard.tsx)
export type TrackingStatus = 'OFFLINE' | 'SIGNAL_LOST' | 'DELAYED' | 'LIVE';

export function resolveTrackingStatus(isOnline: boolean, lastUpdateTs: number): TrackingStatus {
  const dataAgeSeconds = lastUpdateTs ? (Date.now() - lastUpdateTs) / 1000 : 9999;
  
  if (!isOnline) {
    return 'OFFLINE';
  } else if (dataAgeSeconds > 130) {
    return 'SIGNAL_LOST';
  } else if (dataAgeSeconds > 65) {
    return 'DELAYED';
  }
  return 'LIVE';
}

describe('Tracking Status Resolver', () => {
  it('should return OFFLINE when isOnline is false', () => {
    const status = resolveTrackingStatus(false, Date.now());
    expect(status).toBe('OFFLINE');
  });

  it('should return SIGNAL_LOST when age > 130s', () => {
    const twoMinutesTenSecsAgo = Date.now() - 131000;
    const status = resolveTrackingStatus(true, twoMinutesTenSecsAgo);
    expect(status).toBe('SIGNAL_LOST');
  });

  it('should return DELAYED when age > 65s and <= 130s', () => {
    const seventySecondsAgo = Date.now() - 70000;
    const status = resolveTrackingStatus(true, seventySecondsAgo);
    expect(status).toBe('DELAYED');
  });

  it('should return LIVE when age <= 65s', () => {
    const fiveSecondsAgo = Date.now() - 5000;
    const status = resolveTrackingStatus(true, fiveSecondsAgo);
    expect(status).toBe('LIVE');
  });
});
