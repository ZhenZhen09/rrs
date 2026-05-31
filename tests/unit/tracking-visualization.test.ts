import { describe, it, expect } from 'vitest';

/**
 * CORE TRACKING LOGIC AUDIT
 * Extracted from src/app/components/LiveTrackingMap.tsx
 */

const calculateBearing = (
  from: [number, number],
  to: [number, number],
) => {
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;

  const startLat = (fromLat * Math.PI) / 180;
  const startLng = (fromLng * Math.PI) / 180;
  const endLat = (toLat * Math.PI) / 180;
  const endLng = (toLng * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const toMeters = (latDiff: number, lngDiff: number, atLat: number) => {
  const metersPerLat = 111320;
  const metersPerLng = 111320 * Math.cos((atLat * Math.PI) / 180);
  return {
    x: lngDiff * metersPerLng,
    y: latDiff * metersPerLat,
  };
};

const nearestPointOnSegment = (
  point: [number, number],
  start: [number, number],
  end: [number, number],
) => {
  const atLat = point[0];
  const startOffset = toMeters(start[0] - point[0], start[1] - point[1], atLat);
  const endOffset = toMeters(end[0] - point[0], end[1] - point[1], atLat);
  const vx = endOffset.x - startOffset.x;
  const vy = endOffset.y - startOffset.y;
  const lengthSquared = vx * vx + vy * vy;
  
  // standard projection formula clamped to [0,1]
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (-(startOffset.x * vx + startOffset.y * vy)) / lengthSquared));

  return {
    point: [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ] as [number, number],
    distance: Math.sqrt(
      Math.pow(startOffset.x + vx * t, 2) +
      Math.pow(startOffset.y + vy * t, 2),
    ),
  };
};

const snapToRoute = (
  point: [number, number] | null,
  route: [number, number][],
  maxDistanceMeters = 80,
) => {
  if (!point || route.length < 2) return point;

  let nearest = point;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length - 1; i += 1) {
    const candidate = nearestPointOnSegment(point, route[i], route[i + 1]);
    if (candidate.distance < nearestDistance) {
      nearest = candidate.point;
      nearestDistance = candidate.distance;
    }
  }

  return nearestDistance <= maxDistanceMeters ? nearest : point;
};

const routeBearingAtPoint = (
  point: [number, number] | null,
  route: [number, number][],
  maxDistanceMeters = 80,
) => {
  if (!point || route.length < 2) return null;

  let nearestBearing: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length - 1; i += 1) {
    const segmentStart = route[i];
    const segmentEnd = route[i + 1];
    const candidate = nearestPointOnSegment(point, segmentStart, segmentEnd);

    if (candidate.distance < nearestDistance) {
      nearestDistance = candidate.distance;
      nearestBearing = calculateBearing(segmentStart, segmentEnd);
    }
  }

  return nearestDistance <= maxDistanceMeters ? nearestBearing : null;
};

/**
 * AUDIT SUITE
 */
describe('Tracking Visualization Audit (Blue Car & Trail)', () => {

  describe('Bearing Calculations (Blue Car Rotation)', () => {
    it('calculates North (0 degrees)', () => {
      // From (0,0) to (1,0) should be North
      const bearing = calculateBearing([0, 0], [1, 0]);
      expect(bearing).toBeCloseTo(0, 1);
    });

    it('calculates East (90 degrees)', () => {
      const bearing = calculateBearing([0, 0], [0, 1]);
      expect(bearing).toBeCloseTo(90, 1);
    });

    it('calculates South (180 degrees)', () => {
      const bearing = calculateBearing([1, 0], [0, 0]);
      expect(bearing).toBeCloseTo(180, 1);
    });

    it('calculates West (270 degrees)', () => {
      const bearing = calculateBearing([0, 1], [0, 0]);
      expect(bearing).toBeCloseTo(270, 1);
    });

    it('handles identical points (0 degrees default)', () => {
      const bearing = calculateBearing([14.5, 121], [14.5, 121]);
      expect(bearing).toBe(0);
    });
  });

  describe('Nearest Point on Segment (Trail Projection)', () => {
    const start: [number, number] = [0, 0];
    const end: [number, number] = [0, 0.01]; // Eastward segment ~1.1km

    it('finds point exactly on segment', () => {
      const point: [number, number] = [0, 0.005];
      const result = nearestPointOnSegment(point, start, end);
      expect(result.point[0]).toBeCloseTo(0, 6);
      expect(result.point[1]).toBeCloseTo(0.005, 6);
      expect(result.distance).toBeCloseTo(0, 1);
    });

    it('projects point near segment center', () => {
      // 0.0001 lat diff is ~11 meters
      const point: [number, number] = [0.0001, 0.005];
      const result = nearestPointOnSegment(point, start, end);
      expect(result.point[0]).toBeCloseTo(0, 6);
      expect(result.point[1]).toBeCloseTo(0.005, 6);
      expect(result.distance).toBeGreaterThan(10);
      expect(result.distance).toBeLessThan(12);
    });

    it('clamps to start point if before segment', () => {
      const point: [number, number] = [0, -0.001];
      const result = nearestPointOnSegment(point, start, end);
      expect(result.point).toEqual(start);
    });

    it('clamps to end point if after segment', () => {
      const point: [number, number] = [0, 0.011];
      const result = nearestPointOnSegment(point, start, end);
      expect(result.point).toEqual(end);
    });

    it('handles zero-length segment', () => {
      const result = nearestPointOnSegment([1, 1], start, start);
      expect(result.point).toEqual(start);
    });
  });

  describe('Route Snapping (Blue Trail Magnet)', () => {
    const route: [number, number][] = [
      [14.59, 120.98],
      [14.60, 120.98],
      [14.60, 120.99]
    ];

    it('snaps to first segment', () => {
      // slightly off to the side (west) of first segment
      const point: [number, number] = [14.595, 120.9799];
      const snapped = snapToRoute(point, route, 50);
      expect(snapped[0]).toBeCloseTo(14.595, 6);
      expect(snapped[1]).toBeCloseTo(120.98, 6);
    });

    it('snaps to second segment', () => {
      // slightly north of the corner
      const point: [number, number] = [14.6001, 120.985];
      const snapped = snapToRoute(point, route, 50);
      expect(snapped[0]).toBeCloseTo(14.60, 6);
      expect(snapped[1]).toBeCloseTo(120.985, 6);
    });

    it('refuses to snap if too far', () => {
      // 0.01 degree off is > 1km
      const point: [number, number] = [14.595, 121.0];
      const snapped = snapToRoute(point, route, 100);
      expect(snapped).toEqual(point);
    });

    it('returns point if route is empty or single point', () => {
      expect(snapToRoute([1, 1], [])).toEqual([1, 1]);
      expect(snapToRoute([1, 1], [[0, 0]])).toEqual([1, 1]);
    });
  });

  describe('Route Bearing (Blue Car Alignment to Trail)', () => {
    const route: [number, number][] = [
      [0, 0], // Start
      [1, 0], // Go North
      [1, 1]  // Then Go East
    ];

    it('aligns North on first segment', () => {
      const bearing = routeBearingAtPoint([0.5, 0], route);
      expect(bearing).toBeCloseTo(0, 1);
    });

    it('aligns East on second segment', () => {
      const bearing = routeBearingAtPoint([1, 0.5], route);
      expect(bearing).toBeCloseTo(90, 1);
    });

    it('returns null if too far from route', () => {
      const bearing = routeBearingAtPoint([2, 2], route, 100);
      expect(bearing).toBeNull();
    });
  });
});
