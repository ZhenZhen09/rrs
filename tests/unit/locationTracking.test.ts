import { describe, it, expect } from 'vitest';

// Extract logic from server/locationTracking.ts for isolated unit testing
const isValidCoordinate = (lat: number, lng: number) => {
  if (lat === 0 && lng === 0) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

interface LocationCheckpoint {
  lat: number;
  lng: number;
  timestamp: number;
}

function resolveIntegrity(
  input: { lat: number | null; lng: number | null; timestamp: number | null; isHeartbeat?: boolean },
  lastFix?: LocationCheckpoint
): { valid: boolean; reason?: string } {
  
  // 1. Presence-only Heartbeat check
  if (input.isHeartbeat && (input.lat === null || input.lat === undefined || input.lat === 0)) {
    return { valid: true, reason: 'heartbeat_presence_only' };
  }

  const lat = Number(input.lat);
  const lng = Number(input.lng);

  // 2. Coordinate Validation
  if (!isValidCoordinate(lat, lng)) {
    return { valid: false, reason: 'REJECT_ZERO_COORD' };
  }

  // 3. Timestamp Ordering
  if (lastFix && input.timestamp !== null && input.timestamp <= lastFix.timestamp) {
    return { valid: false, reason: 'REJECT_TIME_SKEW' };
  }

  return { valid: true };
}

describe('GPS Integrity Pipeline (Server-Authoritative)', () => {
  
  describe('isValidCoordinate', () => {
    it('rejects (0,0)', () => {
      expect(isValidCoordinate(0, 0)).toBe(false);
    });

    it('rejects non-finite values', () => {
      expect(isValidCoordinate(NaN, 121)).toBe(false);
    });

    it('rejects out of bounds', () => {
      expect(isValidCoordinate(95, 121)).toBe(false);
      expect(isValidCoordinate(14, 190)).toBe(false);
    });

    it('accepts valid Manila coordinates', () => {
      expect(isValidCoordinate(14.5995, 120.9842)).toBe(true);
    });
  });

  describe('Integrity Resolver', () => {
    const LAST_FIX: LocationCheckpoint = { lat: 14.5, lng: 121.0, timestamp: 1000000 };

    it('REJECTS (0,0) as a regular location update', () => {
      const res = resolveIntegrity({ lat: 0, lng: 0, timestamp: 1000500 });
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('REJECT_ZERO_COORD');
    });

    it('ACCEPTS null coordinates as a heartbeat (Presence Stabilization)', () => {
      const res = resolveIntegrity({ lat: null, lng: null, timestamp: 1000500, isHeartbeat: true });
      expect(res.valid).toBe(true);
      expect(res.reason).toBe('heartbeat_presence_only');
    });

    it('REJECTS older timestamp (Time Skew Protection)', () => {
      // DB has 1000000, incoming is 999999
      const res = resolveIntegrity({ lat: 14.51, lng: 121.01, timestamp: 999999 }, LAST_FIX);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('REJECT_TIME_SKEW');
    });

    it('REJECTS identical timestamp (Sequence Protection)', () => {
      const res = resolveIntegrity({ lat: 14.51, lng: 121.01, timestamp: 1000000 }, LAST_FIX);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('REJECT_TIME_SKEW');
    });

    it('ACCEPTS fresh valid data', () => {
      const res = resolveIntegrity({ lat: 14.51, lng: 121.01, timestamp: 1000001 }, LAST_FIX);
      expect(res.valid).toBe(true);
    });
  });
});
