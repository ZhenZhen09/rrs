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
const MAX_ACCEPTABLE_ACCURACY_M = 1000;

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
  batteryLevel?: number;
  networkType?: string;
}

export const riderLatestState = new Map<string, LocationState>();
export const requestLatestState = new Map<string, LocationState>();
export const suspectRiderPoints = new Map<string, { lat: number; lng: number; timestamp: number }>();

// GEOFENCING CONFIG
const GEOFENCE_RADIUS_M = 100;
const IDLE_TIME_MS = 10 * 60 * 1000; // 10 minutes
const IDLE_DISTANCE_M = 20;

// Track geofence status per request to avoid duplicate events
export const requestGeofenceState = new Map<string, { arrived_pickup: boolean, arrived_dropoff: boolean, last_active: number, last_lat: number, last_lng: number }>();

export const pruneTrackingState = (finishedRequestIds: string[], offlineRiderIds: string[]) => {
  for (const reqId of finishedRequestIds) {
    requestLatestState.delete(reqId);
    requestGeofenceState.delete(reqId);
    // requestPingState is handled outside or we can assume it's passed around, but let's export that one too.
    // wait, where is requestPingState defined? It is created in `handleRiderLocationUpdate` or passed down.
    // Let me check.
  }

  for (const riderId of offlineRiderIds) {
    riderLatestState.delete(riderId);
    suspectRiderPoints.delete(riderId);
  }
};

// HARDENING CONSTANTS (Slice 1)
const MAX_PHYSICAL_SPEED_KMPH = 5000;

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
  if (lat === 0 && lng === 0) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

export async function handleRiderLocationUpdate(input: LocationUpdateInput & { isHeartbeat?: boolean; isSimulation?: boolean }) {
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
    isHeartbeat = false,
    isSimulation = false
  } = input;

  // 1. PRESENCE-ONLY HEARTBEAT (Enterprise Stabilization)
  // If this is a heartbeat and we have no coordinates, just refresh presence and exit.
  if (isHeartbeat && (input.lat === null || input.lat === undefined || input.lat === 0)) {
    if (refreshPresence) {
      touchRiderPresence(riderId, presenceSocketId, io || null);
    }
    
    // HEALTH UPDATE (Presence-only): Even without GPS, update battery/signal
    if (input.batteryLevel !== undefined || input.networkType) {
      pool.query(
        "UPDATE users SET last_battery_level = ?, last_signal_strength = ?, updated_at = NOW() WHERE id = ?",
        [input.batteryLevel ?? null, input.networkType || null, riderId]
      ).catch(e => console.error('[Location] Health-only update failed:', e));
    }

    return { fleetLocationUpdated: false, requestTrackingUpdated: false, reason: 'heartbeat_presence_only' };
  }

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const accuracy = input.accuracy === null || input.accuracy === undefined ? null : Number(input.accuracy);
  const timestamp = input.timestamp === null || input.timestamp === undefined ? null : Number(input.timestamp);
  const now = Date.now();

  if (!riderId || !isValidCoordinate(lat, lng)) {
    console.warn(`[Location] REJECT_ZERO_COORD for rider ${riderId}: Invalid coordinates (${lat}, ${lng})`);
    if (io) io.to('admin-room').emit('tracking-rejected', { riderId, reason: 'invalid_location' });
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'invalid_location' as const,
    };
  }

  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy > MAX_ACCEPTABLE_ACCURACY_M)) {
    console.warn(`[Location] REJECT_LOW_ACCURACY for rider ${riderId}: Low accuracy (${Math.round(accuracy)}m)`);
    if (io) io.to('admin-room').emit('tracking-rejected', { riderId, reason: 'low_accuracy' });
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'low_accuracy' as const,
    };
  }

  // PHYSICAL JUMP CHECK (Slice 1 Hardening)
  const riderState = riderLatestState.get(riderId);
  const lastFix = riderState?.latestDb;

  // Use device timestamp for physics to avoid issues with batched network updates
  // For simulations, ALWAYS use server 'now' to ensure UI freshness (Live status)
  const physicsTimestamp = isSimulation ? now : (timestamp || now);

  // ALWAYS update health metrics if provided, even if GPS is stationary
  if (input.batteryLevel !== undefined || input.networkType) {
    pool.query(
      "UPDATE users SET last_battery_level = ?, last_signal_strength = ?, updated_at = NOW() WHERE id = ?",
      [input.batteryLevel ?? null, input.networkType || null, riderId]
    ).catch(e => console.error('[Location] Real-time health update failed:', e));
  }

  // 2. TIMESTAMP ORDERING PROTECTION (Senior Requirement)
  // Bypassed for simulations as they often jump around during testing.
  if (!isSimulation && lastFix && timestamp !== null && Number(timestamp) <= lastFix.timestamp) {
    console.warn(`[Location] REJECT_TIME_SKEW for ${riderId}: Received ${timestamp}, but DB has ${lastFix.timestamp}`);
    if (io) io.to('admin-room').emit('tracking-rejected', { riderId, reason: 'stale_location', type: 'time_skew' });
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'stale_location' as const,
    };
  }

  if (
    !isSimulation &&
    timestamp !== null &&
    (!Number.isFinite(timestamp) ||
      now - timestamp > MAX_LOCATION_AGE_MS ||
      timestamp - now > MAX_FUTURE_LOCATION_SKEW_MS)
  ) {
    console.warn(`[Location] REJECT_STALE_FIX for rider ${riderId}: Stale timestamp (Age: ${Math.round((now - timestamp)/1000)}s)`);
    if (io) io.to('admin-room').emit('tracking-rejected', { riderId, reason: 'stale_location', type: 'age_limit' });
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'stale_location' as const,
    };
  }

  const isPossible = isSimulation ? true : isPhysicallyPossible(riderId, lat, lng, physicsTimestamp, lastFix);

  if (!isPossible) {
    if (io) io.to('admin-room').emit('tracking-rejected', { riderId, reason: 'invalid_location', type: 'physics_violation' });
    return {
      fleetLocationUpdated: false,
      requestTrackingUpdated: false,
      reason: 'invalid_location' as const,
    };
  }

  // 2. Refresh presence status on every update to prevent watchdog from timing out
  if (refreshPresence) {
    touchRiderPresence(riderId, presenceSocketId, io || null);
  }

  const normalizedRequestId = requestId && requestId !== 'idle' ? requestId : null;
  const dbTimestamp = new Date(physicsTimestamp).toISOString().slice(0, 19).replace('T', ' ');

  const updatePayload = {
    requestId: normalizedRequestId || 'idle',
    riderId,
    riderName,
    lat,
    lng,
    heading,
    accuracy,
    timestamp: physicsTimestamp,
    updatedAt: new Date(physicsTimestamp).toISOString(),
  };

  // TARGETED BROADCAST: Notify both global and specific rooms
  if (io) {
    io.to('admin-room').emit('rider-location-updated', updatePayload);
    
    if (normalizedRequestId) {
      io.to(`job_${normalizedRequestId}`).emit('rider-location-updated', updatePayload);
    } else {
      // Find and notify all active job rooms for this rider
      try {
        const [activeJobs]: any = await pool.query(
          "SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed', 'failed', 'cancelled')",
          [riderId]
        );
        activeJobs.forEach((job: any) => {
          io.to(`job_${job.request_id}`).emit('rider-location-updated', { ...updatePayload, requestId: job.request_id });
        });
      } catch (e) {
        console.error('[Location] Failed to notify active job rooms:', e);
      }
    }
  }

  let fleetLocationUpdated = false;
  if (shouldWriteLatest(riderState, physicsTimestamp)) {
    // Persist position update
    await pool.query(
      "UPDATE users SET status = 'active', current_lat = ?, current_lng = ?, updated_at = ? WHERE id = ?",
      [lat, lng, dbTimestamp, riderId],
    );
    riderLatestState.set(riderId, {
      ...riderState,
      latestDb: { lat, lng, timestamp: physicsTimestamp },
    });
    fleetLocationUpdated = true;
  }


  // --- TARGETED JOB UPDATE ---
  // Ensure the delivery_requests table is updated if the rider has an active job, even if requestId is missing.
  let effectiveRequestId = normalizedRequestId;
  if (!effectiveRequestId) {
    try {
      const [activeRows]: any = await pool.execute(
        "SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed', 'failed', 'cancelled') LIMIT 1",
        [riderId]
      );
      if (activeRows.length > 0) {
        effectiveRequestId = activeRows[0].request_id;
      }
    } catch (e) {
      console.error('[Location] Failed to discover active request:', e);
    }
  }

  if (!effectiveRequestId) {
    return {
      fleetLocationUpdated,
      requestTrackingUpdated: false,
      reason: 'idle' as const,
    };
  }

  const [rows]: any = await pool.execute(
    'SELECT assigned_rider_id, dropoff_lat, dropoff_lng, delivery_status, status FROM delivery_requests WHERE request_id = ?',
    [effectiveRequestId],
  );
  const request = rows[0];

  if (!request) {
    return {
      fleetLocationUpdated,
      requestTrackingUpdated: false,
      reason: 'request_not_found' as const,
    };
  }

  // 3. TERMINAL STATE LOCK
  const terminalStatuses = ['completed', 'delivered', 'failed', 'cancelled'];
  if (terminalStatuses.includes(request.delivery_status) || terminalStatuses.includes(request.status)) {
    return {
      fleetLocationUpdated,
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
    const pingState = requestPingState.get(effectiveRequestId);
    if (!pingState) {
      requestPingState.set(effectiveRequestId, {
        lastPing: physicsTimestamp,
        lastLat: lat,
        lastLng: lng,
        stagnantSince: null,
        exceptions: new Set(),
      });
    } else {
      pingState.lastPing = physicsTimestamp;
      pingState.lastLat = lat;
      pingState.lastLng = lng;
    }
  }

  const distanceToDropoff = getDistance(lat, lng, Number(request.dropoff_lat), Number(request.dropoff_lng));
  const isNearDropoff = distanceToDropoff <= PROXIMITY_RADIUS_M;
  const currentInterval = isNearDropoff ? PROXIMITY_WRITE_INTERVAL_MS : LATEST_LOCATION_WRITE_INTERVAL_MS;

  const requestState = requestLatestState.get(effectiveRequestId);
  const writeLatest = shouldWriteLatest(requestState, physicsTimestamp, currentInterval);
  const writeHistory = shouldWriteHistory(requestState, lat, lng, physicsTimestamp);

  if (writeLatest) {
    await pool.execute(
      'UPDATE delivery_requests SET current_lat = ?, current_lng = ?, updated_at = ? WHERE request_id = ?',
      [lat, lng, dbTimestamp, effectiveRequestId],
    );
  }

  if (writeHistory) {
    await pool.query(
      'INSERT INTO location_logs (request_id, rider_id, lat, lng, timestamp) VALUES (?, ?, ?, ?, ?)',
      [effectiveRequestId, riderId, lat, lng, dbTimestamp],
    );
  }

  requestLatestState.set(effectiveRequestId, {
    latestDb: writeLatest ? { lat, lng, timestamp: physicsTimestamp } : requestState?.latestDb,
    history: writeHistory ? { lat, lng, timestamp: physicsTimestamp } : requestState?.history,
  });

  // --- GEOFENCING & IDLE LOGIC ---
  let gState = requestGeofenceState.get(effectiveRequestId);
  if (!gState) {
    gState = { arrived_pickup: false, arrived_dropoff: false, last_active: physicsTimestamp, last_lat: lat, last_lng: lng };
    requestGeofenceState.set(effectiveRequestId, gState);
  }

  const distToPickup = getDistance(lat, lng, Number(request.pickup_lat), Number(request.pickup_lng));
  const distToDropoff = getDistance(lat, lng, Number(request.dropoff_lat), Number(request.dropoff_lng));

  // --- LAYER 3: PRIORITY GAP WATCHDOG ---
  // If rider is near a High-Weight task but headed elsewhere, alert Admin.
  try {
    const [allActive]: any = await pool.query(
      "SELECT request_id, requester_department, pickup_lat, pickup_lng, urgency_level FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')",
      [riderId]
    );

    for (const other of allActive) {
      if (other.request_id === effectiveRequestId) continue;

      const otherDept = other.requester_department;
      const isHighPriority = otherDept === 'Finance' || otherDept === 'Regulatory' || other.urgency_level === 'Urgent';
      
      if (isHighPriority) {
        const distToHighPriority = getDistance(lat, lng, Number(other.pickup_lat), Number(other.pickup_lng));
        
        // Gap Trigger: Within 1km of High-Priority but working on something else
        if (distToHighPriority <= 1000) {
          const currentTargetDist = request.delivery_status === 'in_progress' ? distToDropoff : distToPickup;
          
          if (currentTargetDist > 1500) {
            if (io) {
              io.to('admin-room').emit('notification-added', {
                id: `gap_${Date.now()}_${riderId}`,
                message: `⚠️ PRIORITY GAP: Rider ${riderName} is within ${Math.round(distToHighPriority)}m of a ${otherDept} task (#${other.request_id.slice(-6).toUpperCase()}) but is continuing toward a further target.`,
                type: 'warning',
                metadata: { type: 'priority_gap', riderId, riderName, highPriorityRequestId: other.request_id, distance: distToHighPriority }
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[Watchdog] Priority Gap Check failed:', e);
  }

  // 1. Arrived Pickup
  if (!gState.arrived_pickup && distToPickup <= GEOFENCE_RADIUS_M) {
    gState.arrived_pickup = true;
    const eventId = `move_${Date.now()}_ap_${Math.random().toString(36).substring(7)}`;
    await pool.query(
      'INSERT INTO movement_events (id, request_id, rider_id, event_type, message, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, effectiveRequestId, riderId, 'arrived_pickup', 'Rider arrived at pickup location (Auto-detected)', JSON.stringify({ distance: Math.round(distToPickup) })]
    );
    if (io) io.to('admin-room').to(`job_${effectiveRequestId}`).emit('timeline-update', { requestId: effectiveRequestId });
  }

  // 2. Arrived Dropoff
  if (!gState.arrived_dropoff && distToDropoff <= GEOFENCE_RADIUS_M) {
    gState.arrived_dropoff = true;
    const eventId = `move_${Date.now()}_ad_${Math.random().toString(36).substring(7)}`;
    await pool.query(
      'INSERT INTO movement_events (id, request_id, rider_id, event_type, message, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, effectiveRequestId, riderId, 'arrived_dropoff', 'Rider arrived at destination (Auto-detected)', JSON.stringify({ distance: Math.round(distToDropoff) })]
    );
    if (io) io.to('admin-room').to(`job_${effectiveRequestId}`).emit('timeline-update', { requestId: effectiveRequestId });
  }

  // 3. Idle Detection
  const timeSinceLastActive = physicsTimestamp - gState.last_active;
  const distSinceLastActive = getDistance(lat, lng, gState.last_lat, gState.last_lng);

  if (timeSinceLastActive >= IDLE_TIME_MS) {
    if (distSinceLastActive < IDLE_DISTANCE_M && distToPickup > GEOFENCE_RADIUS_M && distToDropoff > GEOFENCE_RADIUS_M) {
      const eventId = `move_${Date.now()}_idle_${Math.random().toString(36).substring(7)}`;
      await pool.query(
        'INSERT INTO movement_events (id, request_id, rider_id, event_type, message, metadata) VALUES (?, ?, ?, ?, ?, ?)',
        [eventId, effectiveRequestId, riderId, 'idle_alert', 'Rider has been stationary for over 10 minutes', JSON.stringify({ idle_duration_min: 10 })]
      );
      if (io) io.to('admin-room').to(`job_${effectiveRequestId}`).emit('timeline-update', { requestId: effectiveRequestId });
    }
    // Reset idle tracker
    gState.last_active = physicsTimestamp;
    gState.last_lat = lat;
    gState.last_lng = lng;
  }

  return {
    fleetLocationUpdated,
    requestTrackingUpdated: writeLatest || writeHistory,
    requestLatestPersisted: writeLatest,
    historyLogged: writeHistory,
    reason: undefined,
  };
}
