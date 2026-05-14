import { Server } from 'socket.io';
import { pool } from './db';

const LATEST_LOCATION_WRITE_INTERVAL_MS = 15000;
const HISTORY_LOG_INTERVAL_MS = 30000;
const HISTORY_LOG_DISTANCE_M = 30;
const GEOFENCE_CHECK_INTERVAL_MS = 15000;
const GEOFENCE_RADIUS_M = 200;

interface LocationCheckpoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface LocationState {
  latestDb?: LocationCheckpoint;
  history?: LocationCheckpoint;
  geofenceCheckedAt?: number;
}

interface RequestPingState {
  lastPing: number;
  lastLat: number;
  lastLng: number;
  stagnantSince: number | null;
  exceptions: Set<'signal_lost' | 'stagnant' | 'delayed'>;
}

interface LocationUpdateInput {
  riderId: string;
  requestId?: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  riderName?: string;
  verifyAssignment?: boolean;
  io?: Server | null;
  requestPingState?: Map<string, RequestPingState>;
}

const riderLatestState = new Map<string, LocationState>();
const requestLatestState = new Map<string, LocationState>();

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dP = (lat2 - lat1) * Math.PI / 180;
  const dL = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dP / 2) * Math.sin(dP / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dL / 2) * Math.sin(dL / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const shouldWriteLatest = (state: LocationState | undefined, now: number) => {
  return !state?.latestDb || now - state.latestDb.timestamp >= LATEST_LOCATION_WRITE_INTERVAL_MS;
};

const shouldWriteHistory = (state: LocationState | undefined, lat: number, lng: number, now: number) => {
  if (!state?.history) return true;

  return now - state.history.timestamp >= HISTORY_LOG_INTERVAL_MS ||
    getDistance(lat, lng, state.history.lat, state.history.lng) >= HISTORY_LOG_DISTANCE_M;
};

export async function handleRiderLocationUpdate(input: LocationUpdateInput) {
  const {
    riderId,
    requestId,
    heading,
    riderName = 'Rider',
    verifyAssignment = false,
    io,
    requestPingState,
  } = input;
  const lat = Number(input.lat);
  const lng = Number(input.lng);

  if (!riderId || Number.isNaN(lat) || Number.isNaN(lng)) {
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'invalid_location' as const,
    };
  }

  const normalizedRequestId = requestId && requestId !== 'idle' ? requestId : null;
  const now = Date.now();

  io?.emit('rider-location-updated', {
    requestId: normalizedRequestId || 'idle',
    riderId,
    riderName,
    lat,
    lng,
    heading,
    updatedAt: new Date(now).toISOString(),
  });

  const riderState = riderLatestState.get(riderId);
  let fleetLocationUpdated = false;
  if (shouldWriteLatest(riderState, now)) {
    await pool.query(
      "UPDATE users SET status = 'active', current_lat = ?, current_lng = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [lat, lng, riderId],
    );
    riderLatestState.set(riderId, {
      ...riderState,
      latestDb: { lat, lng, timestamp: now },
    });
    fleetLocationUpdated = true;
  }

  if (!normalizedRequestId) {
    return {
      fleetLocationUpdated,
      requestTrackingUpdated: false,
      reason: 'idle' as const,
    };
  }

  const [rows]: any = await pool.execute(
    'SELECT assigned_rider_id, dropoff_lat, dropoff_lng, delivery_status FROM delivery_requests WHERE request_id = ?',
    [normalizedRequestId],
  );
  const request = rows[0];

  if (!request) {
    return {
      fleetLocationUpdated,
      requestTrackingUpdated: false,
      reason: 'request_not_found' as const,
    };
  }

  if (verifyAssignment && request.assigned_rider_id !== riderId) {
    return {
      fleetLocationUpdated,
      requestTrackingUpdated: false,
      reason: 'not_assigned' as const,
    };
  }

  if (requestPingState) {
    const pingState = requestPingState.get(normalizedRequestId);
    if (!pingState) {
      requestPingState.set(normalizedRequestId, {
        lastPing: now,
        lastLat: lat,
        lastLng: lng,
        stagnantSince: null,
        exceptions: new Set(),
      });
    } else {
      pingState.lastPing = now;
      pingState.lastLat = lat;
      pingState.lastLng = lng;
    }
  }

  const requestState = requestLatestState.get(normalizedRequestId);
  const shouldCheckGeofence = !requestState?.geofenceCheckedAt ||
    now - requestState.geofenceCheckedAt >= GEOFENCE_CHECK_INTERVAL_MS;

  if (
    shouldCheckGeofence &&
    request.delivery_status === 'in_progress' &&
    getDistance(lat, lng, Number(request.dropoff_lat), Number(request.dropoff_lng)) <= GEOFENCE_RADIUS_M
  ) {
    await pool.execute(
      'UPDATE delivery_requests SET delivery_status = ? WHERE request_id = ?',
      ['arrived', normalizedRequestId],
    );
    io?.to(`job_${normalizedRequestId}`).emit('job-status-changed', {
      requestId: normalizedRequestId,
      status: 'arrived',
    });
  }

  const writeLatest = shouldWriteLatest(requestState, now);
  const writeHistory = shouldWriteHistory(requestState, lat, lng, now);

  if (writeLatest) {
    await pool.execute(
      'UPDATE delivery_requests SET current_lat = ?, current_lng = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ?',
      [lat, lng, normalizedRequestId],
    );
  }

  if (writeHistory) {
    await pool.query(
      'INSERT INTO location_logs (request_id, rider_id, lat, lng) VALUES (?, ?, ?, ?)',
      [normalizedRequestId, riderId, lat, lng],
    );
  }

  requestLatestState.set(normalizedRequestId, {
    latestDb: writeLatest ? { lat, lng, timestamp: now } : requestState?.latestDb,
    history: writeHistory ? { lat, lng, timestamp: now } : requestState?.history,
    geofenceCheckedAt: shouldCheckGeofence ? now : requestState?.geofenceCheckedAt,
  });

  return {
    fleetLocationUpdated,
    requestTrackingUpdated: writeLatest || writeHistory,
    requestLatestPersisted: writeLatest,
    historyLogged: writeHistory,
    reason: undefined,
  };
}
