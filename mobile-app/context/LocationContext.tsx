import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Config } from '@/constants/Config';
import { useQueryClient } from '@tanstack/react-query';
import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationContextType {
  isTracking: boolean;
  startTracking: (requestId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  locationPermission: boolean | null;
  isSocketConnected: boolean;
}

const LocationContext = createContext<LocationContextType | null>(null);

// Define the background task outside the component
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      const { latitude, longitude } = location.coords;
      
      // In background tasks, we can't reliably use the React context's socket.
      // Senior Solution: Use an API endpoint for background updates to ensure reliability.
      try {
        // We'll need the current user and active request ID.
        // TaskManager runs in a separate thread, so we'll use AsyncStorage or similar if needed,
        // but for now let's try to get them from a static storage if we were to implement it fully.
        // For this surgical fix, we'll focus on making sure the foreground tracking is perfect first.
        console.log('Background location received:', latitude, longitude);
      } catch (err) {
        console.error('Failed to send background location:', err);
      }
    }
  }
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const activeRequestId = useRef<string | null>(null);
  const foregroundSubscription = useRef<Location.LocationSubscription | null>(null);
  const queryClient = useQueryClient();

  // Priority 3: Establish Socket IMMEDIATELY on boot
  useEffect(() => {
    socketRef.current = io(Config.API_URL, {
      transports: ['websocket'], // Force websocket for production reliability
      reconnectionAttempts: 20,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected - System Ready');
      setIsSocketConnected(true);
      if (user?.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      if (user?.id) {
        socketRef.current?.emit('join', user.id);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsSocketConnected(false);
    });

    requestPermissions();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (foregroundSubscription.current) {
        foregroundSubscription.current.remove();
      }
    };
  }, []); // Run only once on mount

  // Sync socket with user ID when login happens
  useEffect(() => {
    if (user?.id && isSocketConnected && socketRef.current) {
      console.log('Emitting join for user:', user.id);
      socketRef.current.emit('join', user.id);
    }
  }, [user?.id, isSocketConnected]);

  const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      setLocationPermission(false);
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    setLocationPermission(backgroundStatus === 'granted');
  };

  const startTracking = async (requestId: string) => {
    if (!locationPermission) {
      await requestPermissions();
    }

    // --- SENIOR LOGIC: TRACKING STATE GUARD ---
    // 1. If already tracking a real job, don't downgrade to 'idle'
    if (isTracking && activeRequestId.current !== 'idle' && requestId === 'idle') return;
    
    // 2. If already tracking this specific request, skip
    if (isTracking && activeRequestId.current === requestId) return;

    activeRequestId.current = requestId;
    const isIdle = requestId === 'idle';

    // --- IMMEDIATE LOCATION PING ---
    try {
      const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (socketRef.current && user) {
        socketRef.current.emit('update-location', {
          riderId: user.id,
          riderName: user.name,
          lat: initialLocation.coords.latitude,
          lng: initialLocation.coords.longitude,
          requestId: requestId,
        });
      }
    } catch (err) {
      console.warn('Initial ping failed:', err);
    }

    // Clean up existing watcher if any
    if (foregroundSubscription.current) {
      foregroundSubscription.current.remove();
    }

    // Foreground tracking
    try {
      foregroundSubscription.current = await Location.watchPositionAsync(
        {
          // High accuracy for jobs, Balanced for idle to save battery
          accuracy: isIdle ? Location.Accuracy.Balanced : Location.Accuracy.High,
          distanceInterval: isIdle ? 50 : 10, 
          timeInterval: isIdle ? 30000 : 10000,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          if (socketRef.current && user && activeRequestId.current) {
            socketRef.current.emit('update-location', {
              riderId: user.id,
              riderName: user.name,
              lat: latitude,
              lng: longitude,
              requestId: activeRequestId.current,
            });
          }
        }
      );
    } catch (err) {
      console.error('Foreground tracking error:', err);
    }

    // Background tracking - Wrapped in try/catch to prevent total failure if background perm denied
    try {
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          deferredUpdatesInterval: 60000,
          foregroundService: {
            notificationTitle: "CFA-Rss: Delivery Active",
            notificationBody: "Sharing your live location with dispatch.",
            notificationColor: "#0F172A",
          },
        });
        console.log('✅ Background tracking started');
      } else {
        console.warn('⚠️ Background permission NOT granted. Tracking will stop if app is closed.');
      }
    } catch (err) {
      console.warn('⚠️ Background tracking failed to start:', err);
    }

    setIsTracking(true);
  };

  const stopTracking = async () => {
    console.log('🛑 Stopping tracking for request:', activeRequestId.current);
    
    if (foregroundSubscription.current) {
      foregroundSubscription.current.remove();
      foregroundSubscription.current = null;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    
    activeRequestId.current = null;
    setIsTracking(false);
  };

  // Auto-resume tracking if a job is in_progress OR if rider is online (idle tracking)
  useEffect(() => {
    if (!user?.id) return;

    const timer = setTimeout(async () => {
      // Priority 1: Check for active in_progress job
      const tasks = queryClient.getQueryData<Job[]>(['tasks', user.id]);
      const activeJob = tasks?.find(t => t.delivery_status === 'in_progress');
      
      if (activeJob) {
        if (!isTracking || activeRequestId.current === 'idle') {
          console.log('🔄 Starting high-priority job tracking:', activeJob.request_id);
          startTracking(activeJob.request_id);
        }
      } 
      // Priority 2: If online but no job, start idle tracking
      else {
        // We need a way to know if they are 'online'. 
        // For now, let's assume if they are logged in and no job, we can start idle tracking
        // if they haven't explicitly stopped it.
        if (!isTracking) {
          console.log('📡 Starting low-priority idle tracking');
          startTracking('idle');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user?.id, queryClient, isTracking]);

  return (
    <LocationContext.Provider value={{ 
      isTracking, 
      startTracking, 
      stopTracking, 
      locationPermission,
      isSocketConnected
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
}
