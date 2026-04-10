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
      // Background updates usually handled by server-side logic or static socket refs
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
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected - System Ready');
      setIsSocketConnected(true);
      // If user is already logged in (optimistic load), join immediately
      if (user?.id) {
        socket.emit('join', user.id);
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

    // If already tracking this request, don't restart
    if (isTracking && activeRequestId.current === requestId) return;

    // Clean up existing watcher if any
    if (foregroundSubscription.current) {
      foregroundSubscription.current.remove();
    }

    activeRequestId.current = requestId;

    // Foreground tracking (higher frequency for active UI)
    foregroundSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20,
        timeInterval: 15000,
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

    // Background tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50, // Slightly less frequent in background to save battery
      deferredUpdatesInterval: 60000,
      foregroundService: {
        notificationTitle: "Delivery in Progress",
        notificationBody: "Your location is being shared with the dispatcher.",
        notificationColor: "#0F172A",
      },
    });

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

  // Auto-resume tracking if a job is in_progress (e.g. after app restart)
  // We use a more careful check to avoid restarting tracking for completed jobs
  useEffect(() => {
    if (!user?.id || isTracking) return;

    const timer = setTimeout(() => {
      // Check if there are any active jobs today that are in_progress
      const tasks = queryClient.getQueryData<Job[]>(['tasks', user.id]);
      if (tasks) {
        const activeJob = tasks.find(t => t.delivery_status === 'in_progress');
        if (activeJob && !isTracking) {
          console.log('🔄 Auto-resuming tracking for job:', activeJob.request_id);
          startTracking(activeJob.request_id);
        }
      }
    }, 1000); // 1s delay to let status updates settle

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
