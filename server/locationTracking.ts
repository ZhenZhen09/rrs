import { Server } from 'socket.io';
import { pool } from './db';
import { touchRiderPresence } from './presence';

const LATEST_LOCATION_WRITE_INTERVAL_MS = 3000;
const PROXIMITY_WRITE_INTERVAL_MS = 2000;
const PROXIMITY_RADIUS_M = 500;
const HISTORY_LOG_INTERVAL_MS = 15000;
const HISTORY_LOG_DISTANCE_M = 30;
const MAX_LOCATION_AGE_MS = 120000;
const MAX_FUTURE_LOCATION_SKEW_MS = 30000;
const MAX_ACCEPTABLE_ACCURACY_M = 300;

interface LocationCheckpoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface LocationState {
  latestDb?: LocationCheckpoint;
  history?: LocationCheckpoint;
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
  accuracy?: number | null;
  timestamp?: number | string | null;
  riderName?: string;
  verifyAssignment?: boolean;
  presenceSocketId?: string;
  refreshPresence?: boolean;
  io?: Server | null;
  requestPingState?: Map<string, RequestPingState>;
}

const riderLatestState = new Map<string, LocationState>();
const requestLatestState = new Map<string, LocationState>();
const suspectRiderPoints = new Map<string, { lat: number; lng: number; timestamp: number }>();

// HARDENING CONSTANTS (Slice 1)
const MAX_PHYSICAL_SPEED_KMPH = 160;

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dP = ((lat2 - lat1) * Math.PI) / 180;
  const dL = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dP / 2) * Math.sin(dP / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dL / 2) * Math.sin(dL / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const isPhysicallyPossible = (
  riderId: string,
  newLat: number,
  newLng: number,
  newTimestamp: number,
  lastCheckpoint?: LocationCheckpoint,
) => {
  if (!lastCheckpoint) return true;

  const distM = getDistance(lastCheckpoint.lat, lastCheckpoint.lng, newLat, newLng);
  const timeS = (newTimestamp - lastCheckpoint.timestamp) / 1000;

  if (timeS <= 0) return true;

  const speedKmph = (distM / timeS) * 3.6;

  if (speedKmph > MAX_PHYSICAL_SPEED_KMPH) {
    const suspect = suspectRiderPoints.get(riderId);
    if (!suspect) {
      // First strike: mark as suspect but allow for now (could be a jump from a tunnel)
      suspectRiderPoints.set(riderId, { lat: newLat, lng: newLng, timestamp: newTimestamp });
      console.warn(`[Physics] Suspect jump detected for rider ${riderId}: ${Math.round(speedKmph)}km/h. First strike.`);
      return true;
    } else {
      // Second strike: consecutive impossible points.
      console.error(`[Physics] Rejecting consecutive glitch for rider ${riderId}: ${Math.round(speedKmph)}km/h. REJECTED.`);
      return false;
    }
  }

  // Point is valid, clear any suspect strikes
  suspectRiderPoints.delete(riderId);
  return true;
};

const shouldWriteLatest = (state: LocationState | undefined, now: number, customInterval?: number) => {
  const interval = customInterval || LATEST_LOCATION_WRITE_INTERVAL_MS;
  return !state?.latestDb || now - state.latestDb.timestamp >= interval;
};

const shouldWriteHistory = (state: LocationState | undefined, lat: number, lng: number, now: number) => {
  if (!state?.history) return true;

  return now - state.history.timestamp >= HISTORY_LOG_INTERVAL_MS ||
    getDistance(lat, lng, state.history.lat, state.history.lng) >= HISTORY_LOG_DISTANCE_M;
};

const isValidCoordinate = (lat: number, lng: number) => {
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0);
};

export async function handleRiderLocationUpdate(input: LocationUpdateInput) {
  const {
    riderId,
    requestId,
    heading,
    riderName = 'Rider',
    verifyAssignment = false,
    presenceSocketId = 'rest-api',
    refreshPresence = true,
    io,
    requestPingState,
  } = input;
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const accuracy = input.accuracy === null || input.accuracy === undefined ? null : Number(input.accuracy);
  const timestamp = input.timestamp === null || input.timestamp === undefined ? null : Number(input.timestamp);
  const now = Date.now();

  if (!riderId || !isValidCoordinate(lat, lng)) {
    console.warn(`[Location] Rejecting update for rider ${riderId}: Invalid coordinates (${lat}, ${lng})`);
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'invalid_location' as const,
    };
  }

  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy > MAX_ACCEPTABLE_ACCURACY_M)) {
    console.warn(`[Location] Rejecting update for rider ${riderId}: Low accuracy (${Math.round(accuracy)}m)`);
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'low_accuracy' as const,
    };
  }

  if (
    timestamp !== null &&
    (!Number.isFinite(timestamp) ||
      now - timestamp > MAX_LOCATION_AGE_MS ||
      timestamp - now > MAX_FUTURE_LOCATION_SKEW_MS)
  ) {
    console.warn(`[Location] Rejecting update for rider ${riderId}: Stale timestamp (Age: ${Math.round((now - timestamp)/1000)}s)`);
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'stale_location' as const,
    };
  }

  // 1. PHYSICAL JUMP CHECK (Slice 1 Hardening)
  const riderState = riderLatestState.get(riderId);
  const lastFix = riderState?.latestDb;
  const isPossible = isPhysicallyPossible(riderId, lat, lng, now, lastFix);
  
  if (!isPossible) {
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'invalid_location' as const, // Reuse existing reason for simplicity
    };
  }

  // 2. Refresh presence status on every update to prevent watchdog from timing out
  if (refreshPresence) {
    touchRiderPresence(riderId, presenceSocketId, io || null);
  }

  const normalizedRequestId = requestId && requestId !== 'idle' ? requestId : null;

  const updatePayload = {
    requestId: normalizedRequestId || 'idle',
    riderId,
    riderName,
    lat,
    lng,
    heading,
    accuracy,
    updatedAt: new Date(now).toISOString(),
  };

  // Broadcast to general listeners
  io?.emit('rider-location-updated', updatePayload);
  
  // Specific room broadcast for optimized tracking
  if (normalizedRequestId) {
    io?.to(`job_${normalizedRequestId}`).emit('rider-location-updated', updatePayload);
  }

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
    'SELECT assigned_rider_id, dropoff_lat, dropoff_lng, delivery_status, status FROM delivery_requests WHERE request_id = ?',
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

  // 3. TERMINAL STATE LOCK (Slice 2 Hardening)
  // If the job is already done, don't update its coordinates anymore.
  const terminalStatuses = ['completed', 'delivered', 'failed', 'cancelled'];
  if (terminalStatuses.includes(request.delivery_status) || terminalStatuses.includes(request.status)) {
    console.log(`[Location] Skipping update for job ${normalizedRequestId}: already terminal (${request.delivery_status || request.status})`);
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'terminal_state' as const,
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

  const distanceToDropoff = getDistance(lat, lng, Number(request.dropoff_lat), Number(request.dropoff_lng));
  const isNearDropoff = distanceToDropoff <= PROXIMITY_RADIUS_M;
  const currentInterval = isNearDropoff ? PROXIMITY_WRITE_INTERVAL_MS : LATEST_LOCATION_WRITE_INTERVAL_MS;

  const requestState = requestLatestState.get(normalizedRequestId);
  const writeLatest = shouldWriteLatest(requestState, now, currentInterval);
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
  });

  return {
    fleetLocationUpdated,
    requestTrackingUpdated: writeLatest || writeHistory,
    requestLatestPersisted: writeLatest,
    historyLogged: writeHistory,
    reason: undefined,
  };
}
