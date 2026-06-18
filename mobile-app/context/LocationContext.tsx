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
import { updateLocationBackground, updateDutyStatus, submitAttendance, getMyAttendance } from '@/services/apiService';
import { Alert } from 'react-native';

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

type LocationState = {
  lastLocation: { lat: number; lng: number; heading?: number | null } | null;
  isTracking: boolean;
  isOnDuty: boolean;
  attendanceStatus: AttendanceStatus;
  locationPermission: Location.PermissionStatus | null;
  backgroundPermissionGranted: boolean;
  isSocketConnected: boolean;
  startTracking: (requestId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  toggleDuty: (status: boolean, reason?: string) => Promise<boolean>;
  checkIn: (status: 'present' | 'absent' | 'on_leave', reason?: string) => Promise<boolean>;
  refreshCurrentLocation: (requestId?: string) => Promise<LocationState['lastLocation']>;
  refreshAttendance: () => Promise<AttendanceStatus>;
  simulateLocation: (lat: number, lng: number, heading?: number | null, overrideRiderId?: string) => void;
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

const isValidLocation = (location: Location.LocationObject) => {
  const { latitude, longitude, accuracy } = location.coords;
  const timestamp = Number(location.timestamp || 0);
  const age = Date.now() - timestamp;

  if (!isValidCoordinate(latitude, longitude)) return false;
  
  // Rule: Accuracy threshold (Calibrated to 500m)
  if (accuracy !== null && accuracy !== undefined && accuracy > FG_MAX_ACCURACY_M) return false;
  
  // Rule: Freshness check (30 seconds)
  if (!timestamp || age < 0 || age > FG_MAX_AGE_MS) return false;

  return true;
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
  } catch (err) {
    return;
  }

  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations?: Location.LocationObject[] };
    // --- SENIOR FIX: PICK FRESHEST LOCATION ---
    // Background tasks often batch multiple locations. We must pick the most recent one.
    const location = locations?.[locations.length - 1];
    
    if (location) {
      const safeLocation = normalizeLocation(location, 'background');
      if (!safeLocation) {
        return;
      }

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
        
        await updateLocationBackground({ 
          riderId, 
          lat: safeLocation.lat,
          lng: safeLocation.lng,
          heading: safeLocation.heading,
          accuracy: safeLocation.accuracy,
          timestamp: safeLocation.timestamp,
          requestId,
        });
      } catch (err: any) {
        const status = err?.response?.status;
        const reason = err?.response?.data?.error;

        if (status === 401 || status === 403) {
          await stopBackgroundTracking(`auth failure ${status}`);
          return;
        }

        // --- SILENT HANDLING: Expected Hardening Rejections ---
        // These are rejected by server-side safety logic (stale, low accuracy, skew).
        // We log them as warnings instead of loud errors.
        if (status === 400 && (reason === 'stale_location' || reason === 'low_accuracy' || reason === 'stale_location')) {
          console.warn(`[Background] Server rejected fix: ${reason}`);
          return;
        }

        console.error('Failed to update background location:', err);
      }
    }
  }
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(null);
  const [locationPermission, setLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [backgroundPermissionGranted, setBackgroundPermissionGranted] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationState['lastLocation']>(null);
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
  const toggleDuty = async (status: boolean, reason?: string) => {
    if (!user?.id) return false;

    try {
      await updateDutyStatus(user.id, status, reason);
      await AsyncStorage.setItem(STORAGE_DUTY_STATUS, status ? 'true' : 'false');
      setIsOnDuty(status);
      
      // If toggled on, refresh tasks immediately
      if (status) {
        queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
      }
      return true;
    } catch (err: any) {
      console.error('Failed to update duty status:', err);
      
      // SENIOR UX: Capture specific server-side validation error
      if (err.response?.status === 400) {
        const serverError = err.response?.data?.error || "Cannot go off duty while a job is in progress.";
        Alert.alert("Active Task Detected", serverError);
      } else {
        Alert.alert("Connection Error", "Could not update your duty status. Please check your internet connection.");
      }
      return false;
    }
  };

  const checkIn = async (status: 'present' | 'absent' | 'on_leave', reason?: string) => {
    if (!user?.id) return false;

    try {
      await submitAttendance(user.id, status, reason);
      const todayStr = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(STORAGE_ATTENDANCE_DATE, todayStr);
      
      setAttendanceStatus(status);
      if (status === 'present') {
        setIsOnDuty(true);
        await AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'true');
      } else {
        setIsOnDuty(false);
        await AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'false');
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

    let lat = lastLocation?.lat || null;
    let lng = lastLocation?.lng || null;
    let heading = lastLocation?.heading || null;

    // Proactively fetch location if currently missing (Initial lock or idle recovery)
    if (!lat || !lng) {
      try {
        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (fresh && isValidLocation(fresh)) {
          lat = fresh.coords.latitude;
          lng = fresh.coords.longitude;
          heading = fresh.coords.heading;
          lastLocationRef.current = { lat, lng, heading };
          setLastLocation({ lat, lng, heading });
        }
      } catch (err) {
        console.warn('[Heartbeat] Could not fetch fresh fix for heartbeat');
      }
    }

    // Health metrics
    const battery = await Battery.getBatteryLevelAsync();
    const network = await Network.getNetworkStateAsync();

    console.log('[Heartbeat] Sending presence keep-alive...', lat ? `with fix (${lat}, ${lng})` : 'presence-only');
    socketRef.current.emit('update-location', {
      riderId: user.id,
      lat,
      lng,
      heading,
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
    await AsyncStorage.setItem(STORAGE_REQUEST_ID, requestId);
    setIsTracking(true);
  };

  const stopTracking = async () => {
    activeRequestId.current = null;
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

    if (socketRef.current?.connected) {
      socketRef.current.emit('update-location', payload);
      return nextLocation;
    }

    try {
      await updateLocationBackground(payload);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        console.warn(`[LocationContext] ${source} location fallback rejected: ${status}`);
      } else {
        console.error(`[LocationContext] ${source} location fallback failed:`, err);
      }
    }

    return nextLocation;
  }, [user?.id, isOnDuty]);

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
      if (serverData.status) {
        setAttendanceStatus(serverData.status);
        await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, serverData.status);
      } else {
        setAttendanceStatus(null);
        await AsyncStorage.removeItem(STORAGE_ATTENDANCE_STATUS);
      }
      return serverData.status;
    } catch (err) {
      const local = await AsyncStorage.getItem(STORAGE_ATTENDANCE_STATUS);
      if (local) {
        setAttendanceStatus(local as any);
        return local as any;
      }
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

  useEffect(() => {
    if (!user?.id || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsSocketConnected(false);
      lastLocationRef.current = null;
      setLastLocation(null);
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

    socketRef.current = io(Config.API_URL, { 
      transports: ['websocket'],
      auth: { token }
    });
    const socket = socketRef.current;

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

    socket.on('connect', () => {
      setIsSocketConnected(true);
      if (user?.id) socket.emit('join', user.id);
    });

    socket.on('attendance-updated', async (data: any) => {
      setAttendanceStatus(data.status);
      if (data.status === 'present') {
        setIsOnDuty(true);
        await AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'true');
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
          socket.auth = { token: freshToken };
          lastRefreshTime = Date.now();
        }
      } catch (err) {
        console.error('[LocationContext] Pre-reconnect token refresh failed:', err);
      }
    };

    socket.io.on('reconnect_attempt', () => {
      // Socket.io listeners don't support async/await directly for blocking,
      // but updating the .auth object before the next attempt is effective.
      refreshSocketTokenForReconnect();
    });

    socket.on('disconnect', () => setIsSocketConnected(false));
    socket.on('connect_error', (error: Error) => {
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

    socket.on('rider-location-updated', handleLocationUpdate);
    socket.on('new_assignment', refreshRiderData);
    socket.on('request-updated', refreshRiderData);
    socket.on('requests-updated', (data: any) => {
      // LAYER 2: Instant Route Optimization Sync
      if (data?.message) {
        // Show an in-app alert for route changes
        Alert.alert("📍 Route Optimized", data.message);
      }
      refreshRiderData(data);
    });
    socket.on('delivery-status-updated', refreshRiderData);
    socket.on('notification-added', refreshRiderData);

    return () => {
      socket.off('rider-location-updated', handleLocationUpdate);
      socket.off('new_assignment', refreshRiderData);
      socket.off('request-updated', refreshRiderData);
      socket.off('requests-updated');
      socket.off('delivery-status-updated', refreshRiderData);
      socket.off('notification-added', refreshRiderData);
      socket.off('connect_error');
      socket.io.off('reconnect_attempt', refreshSocketTokenForReconnect);
      socket.disconnect();
    };
  }, [queryClient, user?.id, token]);

  // Request permissions and setup always-on tracking
  useEffect(() => {
    if (user?.role !== 'rider') return;

    if (!isOnDuty) {
      if (foregroundSubscription.current) {
        foregroundSubscription.current.remove();
        foregroundSubscription.current = null;
      }
      return;
    }

    (async () => {
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

      // 4. Request Background
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      setBackgroundPermissionGranted(bgStatus === 'granted');

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
      if (!isRegistered && bgStatus === 'granted') {
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
    })();

    return () => {
      if (foregroundSubscription.current) {
        foregroundSubscription.current.remove();
        foregroundSubscription.current = null;
      }
    };
  }, [publishSafeLocation, user?.id, user?.role, isOnDuty]);

  // Load initial states
  useEffect(() => {
    (async () => {
      const duty = await AsyncStorage.getItem(STORAGE_DUTY_STATUS);
      if (duty === 'true') setIsOnDuty(true);

      if (user?.id) {
        syncStatus();
      }
    })();
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

  return (
    <LocationContext.Provider value={{ 
      lastLocation, 
      isTracking, 
      isOnDuty,
      attendanceStatus,
      locationPermission, 
      backgroundPermissionGranted,
      isSocketConnected,
      startTracking,
      stopTracking,
      toggleDuty,
      checkIn,
      refreshCurrentLocation,
      refreshAttendance,
      simulateLocation
    }}>
      {children}
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
