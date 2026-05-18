import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/Config';
import { useAuth } from './AuthContext';

export interface RiderLocation {
  lat: number;
  lng: number;
  name: string; // riderName
  lastUpdate: string; // updatedAt
  heading?: number;
}

export type PresenceStatus = 'online' | 'offline';

interface RealTimeContextType {
  riderLocations: Map<string, RiderLocation>;
  riderPresence: Map<string, PresenceStatus>;
  isConnected: boolean;
  lastRequestUpdate: number;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [riderLocations, setRiderLocations] = useState<Map<string, RiderLocation>>(new Map());
  const [riderPresence, setRiderPresence] = useState<Map<string, PresenceStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastRequestUpdate, setLastRequestUpdate] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let socket: Socket | null = null;

    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      // Clear data on logout
      setRiderLocations(new Map());
      setRiderPresence(new Map());
      setLastRequestUpdate(0);
      return;
    }

    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        
        console.log('Connecting to socket at:', CONFIG.SOCKET_URL);
        socket = io(CONFIG.SOCKET_URL, {
          transports: ['websocket'],
          autoConnect: true,
          auth: { token }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Admin socket connected, joining admin-room');
          setIsConnected(true);
          socket?.emit('join-room', 'admin-room');
        });

        socket.on('disconnect', (reason) => {
          console.log('Admin socket disconnected:', reason);
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        socket.on('rider-location-updated', (data: any) => {
          // Data is flat: { riderId, riderName, lat, lng, heading, updatedAt, requestId }
          setRiderLocations((prev) => {
            const next = new Map(prev);
            next.set(data.riderId, {
              lat: data.lat,
              lng: data.lng,
              name: data.riderName,
              lastUpdate: data.updatedAt,
              heading: data.heading
            });
            return next;
          });
        });

        socket.on('presence-sync', (presenceMap: Record<string, PresenceStatus>) => {
          console.log('Received presence sync:', presenceMap);
          setRiderPresence(new Map(Object.entries(presenceMap)));
        });

        socket.on('rider-presence-changed', (data: { riderId: string; status: PresenceStatus }) => {
          console.log(`Rider ${data.riderId} presence changed to ${data.status}`);
          setRiderPresence((prev) => {
            const next = new Map(prev);
            next.set(data.riderId, data.status);
            return next;
          });
        });

        socket.on('request-updated', (data: any) => {
          console.log('Real-time request update received:', data);
          setLastRequestUpdate(Date.now());
        });
      } catch (err) {
        console.error('Failed to initialize socket:', err);
      }
    };

    initSocket();

    return () => {
      console.log('Cleaning up socket connection');
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  return (
    <RealTimeContext.Provider value={{ riderLocations, riderPresence, isConnected, lastRequestUpdate }}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};
