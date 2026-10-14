import { Router, Response } from 'express';
import { AuthRequest, authorize } from '../middleware/auth';

type Point = { lat: number; lng: number };

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  calculatedAt: string;
  provider: 'osrm' | 'geoapify';
};

const router = Router();
const ROUTE_TIMEOUT_MS = 8_000;

export const isValidPoint = (point: unknown): point is Point => {
  if (!point || typeof point !== 'object') return false;
  const candidate = point as Partial<Point>;
  return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng) &&
    Math.abs(candidate.lat as number) <= 90 && Math.abs(candidate.lng as number) <= 180;
};

const fetchJson = async (url: string): Promise<any> => {
  const fetchImplementation = (globalThis as any).fetch as ((url: string, init?: any) => Promise<any>) | undefined;
  if (!fetchImplementation) throw new Error('Routing fetch is unavailable');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Routing provider returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const getOsrmEstimate = async (origin: Point, destination: Point): Promise<RouteEstimate> => {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
  const data = await fetchJson(url);
  const route = data.routes?.[0];
  if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
    throw new Error('OSRM returned no usable route');
  }
  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    calculatedAt: new Date().toISOString(),
    provider: 'osrm',
  };
};

const getGeoapifyEstimate = async (origin: Point, destination: Point): Promise<RouteEstimate> => {
  const apiKey = process.env.GEOAPIFY_ROUTING_API_KEY || process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error('Geoapify routing key is not configured');
  const waypoints = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`;
  const url = `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}&mode=drive&apiKey=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  const properties = data.features?.[0]?.properties;
  const distanceMeters = Number(properties?.distance);
  const durationSeconds = Number(properties?.time);
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    throw new Error('Geoapify returned no usable route');
  }
  return {
    distanceMeters,
    durationSeconds,
    calculatedAt: new Date().toISOString(),
    provider: 'geoapify',
  };
};

export const getRouteEstimate = async (origin: Point, destination: Point): Promise<RouteEstimate> => {
  try {
    return await getOsrmEstimate(origin, destination);
  } catch (osrmError) {
    try {
      return await getGeoapifyEstimate(origin, destination);
    } catch (geoapifyError) {
      console.warn('[ROUTING] Providers failed', {
        osrm: osrmError instanceof Error ? osrmError.message : osrmError,
        geoapify: geoapifyError instanceof Error ? geoapifyError.message : geoapifyError,
      });
      throw new Error('No routing provider is available');
    }
  }
};

router.post('/eta', authorize(['admin', 'personnel', 'rider']), async (req: AuthRequest, res: Response) => {
  const { origin, destination } = req.body || {};
  if (!isValidPoint(origin) || !isValidPoint(destination)) {
    return res.status(400).json({ error: 'Valid origin and destination coordinates are required.' });
  }

  if (origin.lat === destination.lat && origin.lng === destination.lng) {
    return res.json({
      distanceMeters: 0,
      durationSeconds: 0,
      calculatedAt: new Date().toISOString(),
      provider: 'osrm',
    } satisfies RouteEstimate);
  }

  try {
    return res.json(await getRouteEstimate(origin, destination));
  } catch {
    return res.status(502).json({ error: 'Routing service is temporarily unavailable.' });
  }
});

export default router;
