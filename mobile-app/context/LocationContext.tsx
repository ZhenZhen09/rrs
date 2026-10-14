import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Config } from '@/constants/Config';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthManager } from '@/utils/AuthManager';

import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import { updateDutyStatus, submitAttendance, endShift as endShiftRequest, getMyAttendance, getMyShiftSession } from '@/services/apiService';
import { applyCommittedDutyResult, getOrCreateShiftOperationId } from '@/services/shiftOperationService';
import { appendLocationEvent } from '../services/locationOutbox';
import { flushLocationOutbox } from '../services/locationSyncService';
import { beginTrackingSession, createLocationEvent, endTrackingSession, getTrackingSession } from '../services/trackingSessionService';
import { Alert } from 'react-native';
import { RouteOptimizedModal } from '@/components/RouteOptimizedModal';
import { shouldStartBackgroundLocation } from '@/utils/locationCapability';

const LOCATION_TASK_NAME = 'background-location-task';
const STORAGE_USER_ID = '@rider_id';
const STORAGE_REQUEST_ID = '@active_request_id';
const STORAGE_DUTY_STATUS = '@is_on_duty';
const STORAGE_ATTENDANCE_DATE = '@attendance_date';
const STORAGE_ATTENDANCE_STATUS = '@attendance_status';

// HARDENING CONSTANTS (Slice 1)
const FG_MAX_AGE_MS = 30000;      // 30 seconds
const FG_MAX_ACCURACY_M = 500;    // 500 meters (Relaxed for indoor/urban stability)
const BG_MAX_AGE_MS = 120000;     // 120 seconds
const BG_MAX_ACCURACY_M = 1000;   // 1000 meters (Relaxed for background stability)

let isStoppingBackgroundTask = false;
let hasStoppedBackgroundTask = false;

type AttendanceStatus = 'present' | 'absent' | 'on_leave' | null;
type DutyToggleResult = 'success' | 'failed' | 'handover_required';

type LocationState = {
  lastLocation: { lat: number; lng: number; heading?: number | null; timestamp?: number } | null;
  isTracking: boolean;
  isOnDuty: boolean;
  hasOpenShift: boolean;
  shiftStartedAt: string | null;
  attendanceStatus: AttendanceStatus;
  isShiftStatusReady: boolean;
  locationPermission: Location.PermissionStatus | null;
  backgroundPermissionGranted: boolean;
  isSocketConnected: boolean;
  routeOptimizedMessage: string | null;
  setRouteOptimizedMessage: (msg: string | null) => void;
  startTracking: (requestId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  toggleDuty: (status: boolean) => Promise<DutyToggleResult>;
  endShift: (reason?: string) => Promise<DutyToggleResult>;
  checkIn: (status: 'present' | 'absent' | 'on_leave', reason?: string) => Promise<boolean>;
  refreshCurrentLocation: (requestId?: string) => Promise<LocationState['lastLocation']>;
  refreshAttendance: () => Promise<AttendanceStatus>;
  simulateLocation: (lat: number, lng: number, heading?: number | null, overrideRiderId?: string) => void;
  subscribeToSocketEvent: (event: string, listener: (...args: any[]) => void) => () => void;
};

const LocationContext = createContext<LocationState | null>(null);

const isValidCoordinate = (lat: number, lng: number) => {
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0);
};

const normalizeLocation = (location: Location.LocationObject, mode: 'foreground' | 'background' = 'foreground') => {
  const { latitude, longitude, heading, accuracy } = location.coords;
  const timestamp = Number(location.timestamp || 0);
  const age = Date.now() - timestamp;

  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const maxAge = mode === 'foreground' ? FG_MAX_AGE_MS : BG_MAX_AGE_MS;
  const maxAccuracy = mode === 'foreground' ? FG_MAX_ACCURACY_M : BG_MAX_ACCURACY_M;

  if (!timestamp || age < 0 || age > maxAge) {
    console.warn(`[Location] Rejecting stale ${mode} fix. Age: ${Math.round(age/1000)}s`);
    return null;
  }

  if (accuracy !== null && accuracy !== undefined && accuracy > maxAccuracy) {
    console.warn(`[Location] Rejecting inaccurate ${mode} fix. Accuracy: ${Math.round(accuracy)}m`);
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
    heading,
    accuracy,
    timestamp,
  };
};

const resetBackgroundTaskStopState = () => {
  isStoppingBackgroundTask = false;
  hasStoppedBackgroundTask = false;
};

const persistLocationEvent = async (payload: {
  riderId: string;
  requestId?: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  accuracy?: number | null;
  timestamp?: number;
  batteryLevel?: number;
  networkType?: string;
}, trigger: 'background_event' | 'foreground') => {
  const existing = await getTrackingSession();
  const requestedRequestId = payload.requestId && payload.requestId !== 'idle' ? payload.requestId : existing?.requestId || 'idle';
  if (!existing || existing.riderId !== payload.riderId || existing.requestId !== requestedRequestId) {
    await beginTrackingSession(requestedRequestId, payload.riderId);
  }

  const event = await createLocationEvent({
    latitude: payload.lat,
    longitude: payload.lng,
    capturedAt: Number(payload.timestamp || Date.now()),
    accuracyM: payload.accuracy,
    heading: payload.heading,
    batteryLevel: payload.batteryLevel,
    networkType: payload.networkType,
  });
  await appendLocationEvent(event);
  await flushLocationOutbox(trigger);
  return event;
};

const stopBackgroundTracking = async (reason: string) => {
  if (isStoppingBackgroundTask || hasStoppedBackgroundTask) {
    return;
  }

  isStoppingBackgroundTask = true;
  console.warn(`[Background] Stopping location task: ${reason}`);
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (stopError) {
    console.error('[Background] Failed to stop task:', stopError);
  } finally {
    hasStoppedBackgroundTask = true;
    isStoppingBackgroundTask = false;
  }
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (hasStoppedBackgroundTask || isStoppingBackgroundTask) {
    return;
  }

  // --- PRIVACY GATE: Check Duty Status ---
  try {
    const [dutyStatus, riderId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_DUTY_STATUS),
      AsyncStorage.getItem(STORAGE_USER_ID)
    ]);
    
    if (dutyStatus !== 'true' || !riderId) {
      // Exit silently: task wakes up but does nothing
      return;
    }
  } catch {
    return;
  }

  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations?: Location.LocationObject[] };
    const validLocations = (locations || [])
      .map((location) => normalizeLocation(location, 'background'))
      .filter((location): location is NonNullable<ReturnType<typeof normalizeLocation>> => Boolean(location))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (validLocations.length > 0) {
      try {
        const token = await AuthManager.getValidToken();
        if (!token) {
          await stopBackgroundTracking('no valid token');
          return;
        }

        const userData = await AuthManager.getUserData();
        const riderId = userData?.id;
        if (!riderId) {
          await stopBackgroundTracking('missing rider identity');
          return;
        }
        const requestId = await AsyncStorage.getItem(STORAGE_REQUEST_ID) || 'idle';

        for (const safeLocation of validLocations) {
          await persistLocationEvent({
            riderId,
            lat: safeLocation.lat,
            lng: safeLocation.lng,
            heading: safeLocation.heading,
            accuracy: safeLocation.accuracy,
            timestamp: safeLocation.timestamp,
            requestId,
          }, 'background_event');
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const reason = err?.response?.data?.error;

        if (status === 401 || status === 403) {
          await stopBackgroundTracking(`auth failure ${status}`);
          return;
        }

        if (status === 400 && (reason === 'stale_location' || reason === 'low_accuracy')) {
          console.warn('[Background] Server rejected location batch', {
            reason,
            type: err?.response?.data?.type,
          });
          return;
        }

        console.error('Failed to persist background location batch:', err);
      }
    }
  }
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [hasOpenShift, setHasOpenShift] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(null);
  const [isShiftStatusReady, setIsShiftStatusReady] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [backgroundPermissionGranted, setBackgroundPermissionGranted] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationState['lastLocation']>(null);
  const [routeOptimizedMessage, setRouteOptimizedMessage] = useState<string | null>(null);
  const lastLocationRef = useRef<LocationState['lastLocation']>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const activeRequestId = useRef<string | null>(null);
  const foregroundSubscription = useRef<Location.LocationSubscription | null>(null);
  const socketAuthRefreshInFlight = useRef(false);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    lastLocationRef.current = lastLocation;
  }, [lastLocation]);

  // --- DUTY MANAGEMENT ---
  const toggleDuty = async (status: boolean): Promise<DutyToggleResult> => {
    if (!user?.id) return 'failed';

    if (status) {
      if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
        Alert.alert('Attendance already submitted', 'Your attendance is recorded as absent or on leave. Contact Admin if this needs to change.');
        return 'failed';
      }
      if (!hasOpenShift) {
        Alert.alert('Shift not started', 'Start your shift before going online.');
        return 'failed';
      }
    }

    try {
      const response = await updateDutyStatus(user.id, status);
      const confirmedDuty = Boolean(response.data?.is_on_duty);
      setIsOnDuty(confirmedDuty);
      try { await AsyncStorage.setItem(STORAGE_DUTY_STATUS, confirmedDuty ? 'true' : 'false'); }
      catch (storageError) { console.warn('[LocationContext] Duty cache write failed after server confirmation:', storageError); }
      
      return 'success';
    } catch (err: any) {
      console.error('Failed to update duty status:', err);
      
      // SENIOR UX: Capture specific server-side validation error
      if (err.response?.status === 400) {
        if (err.response?.data?.code === 'HANDOVER_REQUIRED') return 'handover_required';
        const serverError = err.response?.data?.error || "Cannot go off duty while a job is in progress.";
        Alert.alert("Active Task Detected", serverError);
      } else if (err.response?.status === 409) {
        Alert.alert('Shift not active', err.response?.data?.error || 'Start your shift before going online.');
      } else {
        Alert.alert("Connection Error", "Could not update your duty status. Please check your internet connection.");
      }
      return 'failed';
    }
  };

  const endShift = async (reason?: string): Promise<DutyToggleResult> => {
    if (!user?.id || !hasOpenShift) return 'failed';
    try {
      const operationId = await getOrCreateShiftOperationId('end');
      const response = await endShiftRequest(user.id, operationId, reason);
      setHasOpenShift(false);
      setShiftStartedAt(null);
      await applyCommittedDutyResult('end', Boolean(response.data?.is_on_duty), setIsOnDuty);
      return 'success';
    } catch (err: any) {
      console.error('Failed to end shift:', err);
      if (err.response?.status === 400 && err.response?.data?.code === 'HANDOVER_REQUIRED') return 'handover_required';
      const msg = err.response?.data?.error || 'Could not end your shift. Please try again.';
      Alert.alert('Shift End Error', msg);
      return 'failed';
    }
  };

  const checkIn = async (status: 'present' | 'absent' | 'on_leave', reason?: string) => {
    if (!user?.id) return false;

    try {
      const operationId = status === 'present' ? await getOrCreateShiftOperationId('start') : undefined;
      const response = await submitAttendance(user.id, status, reason, operationId);
      const todayStr = new Date().toISOString().split('T')[0];
      try { await AsyncStorage.setItem(STORAGE_ATTENDANCE_DATE, todayStr); }
      catch (storageError) { console.warn('[LocationContext] Attendance date cache write failed after server confirmation:', storageError); }
      try { await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, status); }
      catch (storageError) { console.warn('[LocationContext] Attendance status cache write failed after server confirmation:', storageError); }
      setAttendanceStatus(status);
      setIsShiftStatusReady(true);
      if (status === 'present') {
        setHasOpenShift(Boolean(response.data?.session && !response.data.session.end_time));
        setShiftStartedAt(response.data?.session?.start_time ?? null);
        const confirmedDuty = Boolean(response.data?.is_on_duty);
        if (operationId) await applyCommittedDutyResult('start', confirmedDuty, setIsOnDuty);
        else setIsOnDuty(confirmedDuty);
      } else {
        setHasOpenShift(false);
        setShiftStartedAt(null);
        setIsOnDuty(false);
        try { await AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'false'); }
        catch (storageError) { console.warn('[LocationContext] Duty cache write failed after attendance confirmation:', storageError); }
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
      return true;
    } catch (err: any) {
      console.error('Attendance failed:', err);
      const msg = err.response?.data?.error || "Failed to log attendance. Please try again.";
      Alert.alert("Attendance Error", msg);
      return false;
    }
  };

  // --- HEARTBEAT MECHANISM ---
  const sendHeartbeat = async () => {
    if (!socketRef.current?.connected || !user?.id || !isOnDuty) return;
    if (user.role !== 'rider') return;

    // Health metrics
    const battery = await Battery.getBatteryLevelAsync();
    const network = await Network.getNetworkStateAsync();

    console.log('[Heartbeat] Sending presence keep-alive...');
    socketRef.current?.emit('update-location', {
      riderId: user.id,
      lat: null,
      lng: null,
      heading: null,
      timestamp: Date.now(),
      requestId: activeRequestId.current || 'idle',
      isHeartbeat: true,
      batteryLevel: Math.round(battery * 100),
      networkType: network.type
    });
  };

  useEffect(() => {
    if (isSocketConnected && user?.id && isOnDuty) {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      // Reduce interval to 1 minute for better stability
      heartbeatInterval.current = setInterval(sendHeartbeat, 60000);
      sendHeartbeat();
    }
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, [isSocketConnected, user?.id, isOnDuty]);

  // --- TRACKING CONTROL FUNCTIONS ---
  const startTracking = async (requestId: string) => {
    activeRequestId.current = requestId;
    if (user?.id) await beginTrackingSession(requestId, user.id);
    await AsyncStorage.setItem(STORAGE_REQUEST_ID, requestId);
    setIsTracking(true);
  };

  const stopTracking = async () => {
    activeRequestId.current = null;
    await endTrackingSession();
    await AsyncStorage.removeItem(STORAGE_REQUEST_ID);
    setIsTracking(false);
  };

  const publishSafeLocation = useCallback(async (
    safeLocation: NonNullable<ReturnType<typeof normalizeLocation>>,
    source: 'initial' | 'watch' | 'manual',
    requestIdOverride?: string,
  ) => {
    if (!user?.id || !isOnDuty) {
      console.log(`[LocationContext] Suppressing ${source} update: User is ${!user?.id ? 'unauthenticated' : 'off-duty'}`);
      return null;
    }

    const nextLocation = {
      lat: safeLocation.lat,
      lng: safeLocation.lng,
      heading: safeLocation.heading,
      timestamp: safeLocation.timestamp,
    };
    lastLocationRef.current = nextLocation;
    setLastLocation(nextLocation);

    // Health metrics
    const battery = await Battery.getBatteryLevelAsync();
    const network = await Network.getNetworkStateAsync();

    const payload = {
      riderId: user.id,
      lat: safeLocation.lat,
      lng: safeLocation.lng,
      heading: safeLocation.heading,
      accuracy: safeLocation.accuracy,
      timestamp: safeLocation.timestamp,
      requestId: requestIdOverride || activeRequestId.current || 'idle',
      batteryLevel: Math.round(battery * 100),
      networkType: network.type
    };

    try {
      await persistLocationEvent(payload, 'foreground');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        console.warn(`[LocationContext] ${source} location fallback rejected: ${status}`);
      } else {
        console.error(`[LocationContext] ${source} location fallback failed:`, err);
      }
    }

    return nextLocation;
  }, [user, isOnDuty]);

  const refreshCurrentLocation = useCallback(async (requestId?: string) => {
    if (user?.role !== 'rider') return lastLocationRef.current;

    if (requestId) {
      activeRequestId.current = requestId;
      await AsyncStorage.setItem(STORAGE_REQUEST_ID, requestId);
      setIsTracking(true);
    }

    let permission = locationPermission;
    if (permission !== 'granted') {
      const result = await Location.requestForegroundPermissionsAsync();
      permission = result.status;
      setLocationPermission(result.status);
    }

    if (permission !== 'granted') {
      console.warn('[LocationContext] Cannot refresh current location without foreground permission');
      return lastLocationRef.current;
    }

    try {
      const cachedLocation = await Location.getLastKnownPositionAsync({
        maxAge: FG_MAX_AGE_MS,
        requiredAccuracy: FG_MAX_ACCURACY_M,
      });
      const safeCached = cachedLocation ? normalizeLocation(cachedLocation) : null;
      if (safeCached) {
        await publishSafeLocation(safeCached, 'manual', requestId);
      }
    } catch (err) {
      console.warn('[LocationContext] Last-known location lookup failed:', err);
    }

    try {
      const freshLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const safeFresh = normalizeLocation(freshLocation);
      if (!safeFresh) return lastLocationRef.current;
      return publishSafeLocation(safeFresh, 'manual', requestId);
    } catch (err) {
      console.warn('[LocationContext] Manual current location refresh failed:', err);
      return lastLocationRef.current;
    }
  }, [locationPermission, publishSafeLocation, user?.role]);

  const syncStatus = useCallback(async () => {
    try {
      const serverData = await getMyAttendance();
      const shiftData = await getMyShiftSession();
      const confirmedDuty = Boolean(shiftData.is_on_duty);
      setHasOpenShift(Boolean(shiftData.session && !shiftData.session.end_time));
      setShiftStartedAt(shiftData.session?.start_time ?? null);
      setIsOnDuty(confirmedDuty);
      await AsyncStorage.setItem(STORAGE_DUTY_STATUS, confirmedDuty ? 'true' : 'false');
      if (serverData.status) {
        setAttendanceStatus(serverData.status);
        await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, serverData.status);
      } else {
        setAttendanceStatus(null);
        await AsyncStorage.removeItem(STORAGE_ATTENDANCE_STATUS);
      }
      setIsShiftStatusReady(true);
      return serverData.status;
    } catch {
      const local = await AsyncStorage.getItem(STORAGE_ATTENDANCE_STATUS);
      if (local) {
        setAttendanceStatus(local as any);
        setIsShiftStatusReady(true);
        return local as any;
      }
      setIsShiftStatusReady(true);
      return null;
    }
  }, []);

  const refreshAttendance = async () => {
    return await syncStatus();
  };

  const simulateLocation = (lat: number, lng: number, heading?: number | null, overrideRiderId?: string) => {
    const targetRiderId = overrideRiderId || user?.id;
    if (!targetRiderId || !isValidCoordinate(lat, lng)) return;
    
    // Update local state so the app UI reacts
    lastLocationRef.current = { lat, lng, heading };
    setLastLocation({ lat, lng, heading });

    // Emit to system via socket so Admin/Personnel see it
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-location', {
        riderId: targetRiderId,
        lat,
        lng,
        heading,
        timestamp: Date.now(),
        requestId: activeRequestId.current || 'idle',
        isSimulation: true
      });
    }
  };

  const resetSocketState = useCallback(() => {
    setIsSocketConnected(false);
    lastLocationRef.current = null;
    setLastLocation(null);
  }, []);

  useEffect(() => {
    if (!user?.id || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      // This reset mirrors the external socket lifecycle when authentication disappears.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetSocketState();
      return;
    }

    const recoverSocketAuth = async (reason: string) => {
      if (socketAuthRefreshInFlight.current) return;

      socketAuthRefreshInFlight.current = true;
      try {
        console.warn(`[LocationContext] Socket auth recovery triggered: ${reason}`);
        const freshToken = await AuthManager.getValidToken();
        if (!freshToken || !socketRef.current) {
          return;
        }

        socketRef.current.auth = { token: freshToken };
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      } catch (err) {
        console.error('[LocationContext] Socket auth recovery failed:', err);
      } finally {
        socketAuthRefreshInFlight.current = false;
      }
    };

    let socket: ReturnType<typeof io> | null = null;
    let socketSetupCancelled = false;
    let cleanupSocket: (() => void) | null = null;
    const setupSocket = async () => {
      const freshToken = await AuthManager.getValidToken();
      if (socketSetupCancelled || !freshToken) return;

      socketRef.current = io(Config.API_URL, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        reconnection: true,
        auth: { token: freshToken },
      });
      socket = socketRef.current;
      if (!socket) return;
      const activeSocket = socket;

    const refreshRiderData = (data?: any) => {
      if (!user?.id) return;

      // Handle remote job termination or re-assignment
      if (data?.request_id && data.request_id === activeRequestId.current) {
        const status = data.delivery_status || data.status;
        const terminalStatuses = ['cancelled', 'completed', 'failed', 'disapproved'];
        
        const isTerminated = terminalStatuses.includes(status);
        const isReassigned = data.assigned_rider_id && data.assigned_rider_id !== user.id;

        if (isTerminated || isReassigned) {
          console.log(`[LocationContext] Stopping tracking for ${data.request_id} due to remote ${isReassigned ? 're-assignment' : 'termination (' + status + ')'}`);
          stopTracking();
        }
      }

      if (data?.request_id) {
        queryClient.invalidateQueries({ queryKey: ['job', data.request_id] });
      }

      queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['historyTasks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    };

    activeSocket.on('connect', () => {
      setIsSocketConnected(true);
      if (user?.id) activeSocket.emit('join', user.id);
    });

    activeSocket.on('attendance-updated', async (data: any) => {
      setAttendanceStatus(data.status);
      if (data.status === 'present') {
        // Attendance presence is not itself a shift session. The duty state is
        // sourced from the shift-session endpoint and updated by checkIn().
        const attendance = await getMyShiftSession().catch(() => null);
        if (attendance) {
          setHasOpenShift(Boolean(attendance.session && !attendance.session.end_time));
          setShiftStartedAt(attendance.session?.start_time ?? null);
          const confirmedDuty = Boolean(attendance.is_on_duty);
          setIsOnDuty(confirmedDuty);
          await AsyncStorage.setItem(STORAGE_DUTY_STATUS, confirmedDuty ? 'true' : 'false');
        }
        setIsShiftStatusReady(true);
      } else if (data.status === 'absent' || data.status === 'on_leave') {
        setIsOnDuty(false);
        await AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'false');
        setIsShiftStatusReady(true);
      } else {
        setIsShiftStatusReady(true);
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    });

    let lastRefreshTime = 0;
    const REFRESH_COOLDOWN_MS = 60000; // Only refresh once per minute maximum

    const refreshSocketTokenForReconnect = async () => {
      const now = Date.now();
      if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
        return;
      }

      try {
        console.log('[LocationContext] Proactively refreshing token for reconnect attempt...');
        const freshToken = await AuthManager.getValidToken();
        if (freshToken) {
          activeSocket.auth = { token: freshToken };
          lastRefreshTime = Date.now();
        }
      } catch (err) {
        console.error('[LocationContext] Pre-reconnect token refresh failed:', err);
      }
    };

    activeSocket.io.on('reconnect_attempt', () => {
      // Socket.io listeners don't support async/await directly for blocking,
      // but updating the .auth object before the next attempt is effective.
      refreshSocketTokenForReconnect();
    });

    activeSocket.on('disconnect', () => setIsSocketConnected(false));
    activeSocket.on('connect_error', (error: Error) => {
      setIsSocketConnected(false);
      const message = error?.message || '';
      console.warn('[LocationContext] Socket connect error:', message);
      if (/auth|token|jwt/i.test(message)) {
        recoverSocketAuth(message);
      }
    });

    const handleLocationUpdate = (data: any) => {
      // ENFORCE SSOT: Only process updates for the current user/rider
      if (data.riderId === user?.id && data.lat && data.lng) {
        lastLocationRef.current = {
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || null,
        };
        setLastLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || null,
        });
      }
    };

    activeSocket.on('rider-location-updated', handleLocationUpdate);
    activeSocket.on('new_assignment', refreshRiderData);
    activeSocket.on('request-updated', refreshRiderData);
    activeSocket.on('requests-updated', (data: any) => {
      // LAYER 2: Instant Route Optimization Sync
      if (data?.message) {
        // Show the professional in-app modal for route changes
        setRouteOptimizedMessage(data.message);
      }
      refreshRiderData(data);
    });
    activeSocket.on('delivery-status-updated', refreshRiderData);
    activeSocket.on('notification-added', refreshRiderData);

    cleanupSocket = () => {
      activeSocket.off('rider-location-updated', handleLocationUpdate);
      activeSocket.off('new_assignment', refreshRiderData);
      activeSocket.off('request-updated', refreshRiderData);
      activeSocket.off('requests-updated');
      activeSocket.off('delivery-status-updated', refreshRiderData);
      activeSocket.off('notification-added', refreshRiderData);
      activeSocket.off('connect_error');
      activeSocket.io.off('reconnect_attempt', refreshSocketTokenForReconnect);
      activeSocket.disconnect();
    };

    };

    void setupSocket();

    return () => {
      socketSetupCancelled = true;
      cleanupSocket?.();
    };
  }, [queryClient, user?.id, token, resetSocketState]);

  // Request permissions and setup always-on tracking
  useEffect(() => {
    if (user?.role !== 'rider') return;

    if (!isOnDuty) {
      if (foregroundSubscription.current) {
        foregroundSubscription.current.remove();
        foregroundSubscription.current = null;
      }
      void stopBackgroundTracking('off duty');
      return;
    }

    (async () => {
      try {
        resetBackgroundTaskStopState();

        // 1. Store ID for background task
        await AsyncStorage.setItem(STORAGE_USER_ID, user.id);

        // 2. Load existing active request if any
        const savedRequestId = await AsyncStorage.getItem(STORAGE_REQUEST_ID);
        if (savedRequestId) {
          activeRequestId.current = savedRequestId;
          setIsTracking(true);
        }

        // 3. Request Foreground
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(fgStatus);

        if (fgStatus !== 'granted') return;

        // 4. Request Background only when the native task API is available.
        // Expo Go may load the JavaScript API but cannot provide native background execution.
        const taskManagerAvailable = await TaskManager.isAvailableAsync();
        let bgPermissionGranted = false;
        if (taskManagerAvailable) {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          bgPermissionGranted = bgStatus === 'granted';
        } else {
          console.warn('[Background] Native background location is unavailable. Use a development build instead of Expo Go.');
        }
        setBackgroundPermissionGranted(bgPermissionGranted);

        const publishLocation = async (
          location: Location.LocationObject,
          source: 'initial' | 'watch',
        ) => {
          const safeLocation = normalizeLocation(location);
          if (!safeLocation) {
            console.warn(`[LocationContext] Ignoring stale or inaccurate ${source} location`);
            return;
          }
          await publishSafeLocation(safeLocation, source);
        };

        // 5. Send a fresh first fix before starting continuous watching.
        try {
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await publishLocation(initialLocation, 'initial');
        } catch (err) {
          console.warn('[LocationContext] Initial location fix failed:', err);
        }

        // 6. Start Foreground Tracking (Always-On for Online Riders)
        if (foregroundSubscription.current) foregroundSubscription.current.remove();

        foregroundSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 5000,
          },
          (location) => {
            publishLocation(location, 'watch');
          }
        );

        // 7. Start Background Task
        const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (shouldStartBackgroundLocation({
          taskManagerAvailable,
          permissionGranted: bgPermissionGranted,
          taskRegistered: isRegistered,
        })) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 50,
            foregroundService: {
              notificationTitle: "RRS Tracking",
              notificationBody: "Live location is active",
              notificationColor: "#0F172A"
            }
          });
        }
      } catch (err) {
        console.warn('[LocationContext] Location tracking setup failed:', err);
      }
    })();

    return () => {
      if (foregroundSubscription.current) {
        foregroundSubscription.current.remove();
        foregroundSubscription.current = null;
      }
    };
  }, [publishSafeLocation, user?.id, user?.role, isOnDuty]);

  // Load initial server state. Do not render from the duty cache first: it may
  // be stale and briefly show ONLINE while the current shift is actually closed.
  useEffect(() => {
    if (user?.id) void syncStatus();
  }, [user?.id, syncStatus]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.on('dev-simulate', (data: any) => {
        if (data.type === 'AUTO_OFF') {
          setIsOnDuty(false);
          AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'false');
          Alert.alert("Shift Ended", data.message);
        }
      });
      return () => {
        socket.off('dev-simulate');
      };
    }
  }, [isSocketConnected]);

  const subscribeToSocketEvent = useCallback((event: string, listener: (...args: any[]) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => undefined;
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, []);

  return (
    <LocationContext.Provider value={{ 
      lastLocation, 
      isTracking, 
      isOnDuty,
      hasOpenShift,
      shiftStartedAt,
      attendanceStatus,
      isShiftStatusReady,
      locationPermission, 
      backgroundPermissionGranted,
      isSocketConnected,
      routeOptimizedMessage,
      setRouteOptimizedMessage,
      startTracking,
      stopTracking,
      toggleDuty,
      endShift,
      checkIn,
      refreshCurrentLocation,
      refreshAttendance,
      simulateLocation,
      subscribeToSocketEvent
    }}>
      {children}
      <RouteOptimizedModal 
        visible={!!routeOptimizedMessage}
        onClose={() => setRouteOptimizedMessage(null)}
        message={routeOptimizedMessage || undefined}
      />
    </LocationContext.Provider>
  );
}

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
