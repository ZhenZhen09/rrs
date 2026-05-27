import { describe, it, expect } from 'vitest';

// The logic we want to audit (extracted from LiveTrackingDashboard.tsx)
export type TrackingStatus = 'OFFLINE' | 'SIGNAL_LOST' | 'DELAYED' | 'LIVE';

export function auditIsOnline(
  riderId: string | undefined, 
  socketPresence: Record<string, string>, 
  apiRiderIsOnline: boolean | undefined
): boolean {
  // THIS IS THE EXACT LOGIC FROM THE DASHBOARD
  return riderId 
    ? (socketPresence[riderId] === 'online' || apiRiderIsOnline === true)
    : false;
}

export function auditTrackingStatus(
  isOnline: boolean, 
  lastUpdateTs: number,
  isFinished: boolean
): TrackingStatus | 'FINISHED_OFFLINE' {
  if (isFinished) return 'FINISHED_OFFLINE';

  const dataAgeSeconds = lastUpdateTs ? (Date.now() - lastUpdateTs) / 1000 : 9999;
  
  if (!isOnline) {
    return 'OFFLINE';
  } else if (dataAgeSeconds > 60) {
    return 'SIGNAL_LOST';
  } else if (dataAgeSeconds > 15) {
    return 'DELAYED';
  }
  return 'LIVE';
}

describe('LiveTrackingDashboard Deep Audit', () => {
  const RIDER_ID = 'rider_123';

  describe('Online State Resolution', () => {
    it('FAIL CASE: should return false if riderId is missing (unassigned)', () => {
      expect(auditIsOnline(undefined, {}, true)).toBe(false);
    });

    it('SUCCESS: should be online if socket says online', () => {
      expect(auditIsOnline(RIDER_ID, { [RIDER_ID]: 'online' }, false)).toBe(true);
    });

    it('SUCCESS: should be online if API says online (socket fallback)', () => {
      expect(auditIsOnline(RIDER_ID, { [RIDER_ID]: 'offline' }, true)).toBe(true);
    });

    it('OFFLINE CASE: should be offline if BOTH socket and API say so', () => {
      expect(auditIsOnline(RIDER_ID, { [RIDER_ID]: 'offline' }, false)).toBe(false);
    });

    it('OFFLINE CASE: should be offline if socket is empty AND API is undefined', () => {
      expect(auditIsOnline(RIDER_ID, {}, undefined)).toBe(false);
    });
  });

  describe('Status Resolver Priority', () => {
    it('PRIORITY 1: OFFLINE overrides stale data', () => {
      // Even if data is fresh (5s), if offline -> OFFLINE
      const status = auditTrackingStatus(false, Date.now() - 5000, false);
      expect(status).toBe('OFFLINE');
    });

    it('PRIORITY 2: SIGNAL_LOST (age > 60s) when online', () => {
      const status = auditTrackingStatus(true, Date.now() - 65000, false);
      expect(status).toBe('SIGNAL_LOST');
    });

    it('PRIORITY 3: DELAYED (15s < age < 60s) when online', () => {
      const status = auditTrackingStatus(true, Date.now() - 30000, false);
      expect(status).toBe('DELAYED');
    });

    it('PRIORITY 4: LIVE (age < 15s) when online', () => {
      const status = auditTrackingStatus(true, Date.now() - 5000, false);
      expect(status).toBe('LIVE');
    });
  });
});
