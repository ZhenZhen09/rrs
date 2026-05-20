import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Config } from '@/constants/Config';
import { useQueryClient } from '@tanstack/react-query';
import { updateLocationBackground } from '@/services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthManager } from '@/utils/AuthManager';

const LOCATION_TASK_NAME = 'background-location-task';
const STORAGE_USER_ID = '@rider_id';
const STORAGE_REQUEST_ID = '@active_request_id';
let isStoppingBackgroundTask = false;
let hasStoppedBackgroundTask = false;

type LocationState = {
  lastLocation: { lat: number; lng: number; heading?: number | null } | null;
  isTracking: boolean;
  locationPermission: Location.PermissionStatus | null;
  backgroundPermissionGranted: boolean;
  isSocketConnected: boolean;
  startTracking: (requestId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  simulateLocation: (lat: number, lng: number, heading?: number | null) => void;
};

const LocationContext = createContext<LocationState | null>(null);

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

  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations?: Location.LocationObject[] };
    const location = locations?.[0];
    if (location) {
      const { latitude, longitude } = location.coords;
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
          lat: latitude, 
          lng: longitude, 
          requestId 
        });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          await stopBackgroundTracking(`auth failure ${status}`);
          return;
        }
        console.error('Failed to update background location:', err);
      }
    }
  }
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [backgroundPermissionGranted, setBackgroundPermissionGranted] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationState['lastLocation']>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const activeRequestId = useRef<string | null>(null);
  const foregroundSubscription = useRef<Location.LocationSubscription | null>(null);

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

  const simulateLocation = (lat: number, lng: number, heading?: number | null) => {
    if (!user?.id) return;
    
    // Update local state so the app UI reacts
    setLastLocation({ lat, lng, heading });

    // Emit to system via socket so Admin/Personnel see it
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-location', {
        riderId: user.id,
        lat,
        lng,
        requestId: activeRequestId.current || 'idle'
      });
    }
  };

  useEffect(() => {
    socketRef.current = io(Config.API_URL, { transports: ['websocket'] });
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

      queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      queryClient.invalidateQueries({ queryKey: ['requestCounts', user.id] });
    };

    socket.on('connect', () => {
      setIsSocketConnected(true);
      if (user?.id) socket.emit('join', user.id);
    });

    socket.on('disconnect', () => setIsSocketConnected(false));
    socket.on('new_assignment', refreshRiderData);
    socket.on('request-updated', refreshRiderData);
    socket.on('delivery-status-updated', refreshRiderData);
    socket.on('notification-added', refreshRiderData);

    return () => {
      socket.off('new_assignment', refreshRiderData);
      socket.off('request-updated', refreshRiderData);
      socket.off('delivery-status-updated', refreshRiderData);
      socket.off('notification-added', refreshRiderData);
      socket.disconnect();
    };
  }, [queryClient, user?.id]);

  // Request permissions and setup always-on tracking
  useEffect(() => {
    (async () => {
      if (user?.role !== 'rider') return;

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

      // 5. Start Foreground Tracking (Always-On for Online Riders)
      if (foregroundSubscription.current) foregroundSubscription.current.remove();
      
      foregroundSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location) => {
          const { latitude, longitude, heading } = location.coords;
          setLastLocation({ lat: latitude, lng: longitude, heading });
          
          if (socketRef.current?.connected) {
            socketRef.current.emit('update-location', {
              riderId: user.id,
              lat: latitude,
              lng: longitude,
              requestId: activeRequestId.current || 'idle'
            });
          }
        }
      );

      // 6. Start Background Task
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
      if (foregroundSubscription.current) foregroundSubscription.current.remove();
    };
  }, [user?.id, user?.role]);

  return (
    <LocationContext.Provider value={{ 
      lastLocation, 
      isTracking, 
      locationPermission, 
      backgroundPermissionGranted,
      isSocketConnected,
      startTracking,
      stopTracking,
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
