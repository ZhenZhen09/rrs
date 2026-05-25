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

export interface RealTimeToast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface RealTimeContextType {
  riderLocations: Map<string, RiderLocation>;
  riderPresence: Map<string, PresenceStatus>;
  isConnected: boolean;
  lastRequestUpdate: number;
  toast: RealTimeToast | null;
  showToast: (message: string, type?: RealTimeToast['type']) => void;
  hideToast: () => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [riderLocations, setRiderLocations] = useState<Map<string, RiderLocation>>(new Map());
  const [riderPresence, setRiderPresence] = useState<Map<string, PresenceStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastRequestUpdate, setLastRequestUpdate] = useState<number>(0);
  const [toast, setToast] = useState<RealTimeToast | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const showToast = (message: string, type: RealTimeToast['type'] = 'info') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
  };

  const hideToast = () => setToast(null);

  useEffect(() => {
    let socket: Socket | null = null;

    if (!isAuthenticated || !token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setRiderLocations(new Map());
      setRiderPresence(new Map());
      setLastRequestUpdate(0);
      return;
    }

    const initSocket = () => {
      try {
        console.log('Connecting to socket with token at:', CONFIG.SOCKET_URL);
        socket = io(CONFIG.SOCKET_URL, {
          transports: ['websocket'],
          autoConnect: true,
          auth: { token }, // Initial token
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Admin socket connected');
          setIsConnected(true);
          setLastRequestUpdate(Date.now());
          
          if (user.role === 'admin') {
            console.log('Joining admin-room');
            socket?.emit('join-room', 'admin-room');
          } else {
            console.log(`User role ${user.role} not authorized for admin-room`);
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('Admin socket disconnected:', reason);
          setIsConnected(false);
        });

        // Ensure reconnection attempts use the latest token if it changed
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          
          if (error.message === 'Authentication error: Invalid token') {
            console.log('Socket token rejected by server.');
            // We could trigger a logout here if we're sure it's invalid,
            // but let's just log it for now to avoid aggressive logouts.
          }
        });

        socket.on('error', (error) => {
          console.error('Socket general error:', error);
        });

        socket.on('rider-location-updated', (data: any) => {
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
          setRiderPresence(new Map(Object.entries(presenceMap)));
        });

        socket.on('rider-presence-changed', (data: { riderId: string; status: PresenceStatus }) => {
          setRiderPresence((prev) => {
            const next = new Map(prev);
            next.set(data.riderId, data.status);
            return next;
          });
        });

        socket.on('request-updated', (data: any) => {
          console.log('Request updated event received');
          const id = data.request_id?.slice(-6).toUpperCase() || '---';
          const status = data.status?.replace('_', ' ').toUpperCase() || 'UPDATED';
          showToast(`Request #${id} is now ${status}`, 'info');
          setLastRequestUpdate(Date.now());
        });

        socket.on('delivery-status-updated', (data: any) => {
          console.log('Delivery status updated event received');
          const id = data.request_id?.slice(-6).toUpperCase() || '---';
          let status = data.status?.replace('_', ' ').toUpperCase() || 'UPDATED';
          let type: any = 'info';
          
          if (data.status === 'in_progress') {
            status = 'ON ROUTE';
            type = 'info';
          } else if (data.status === 'completed') {
            status = 'COMPLETE';
            type = 'success';
          } else if (data.status === 'failed') {
            status = 'FAILED';
            type = 'error';
          }

          if (data.actor_role === 'admin' && data.status === 'completed') {
            showToast('Transaction marked as complete by the admin.', 'success');
          } else if (data.actor_role === 'admin' && data.status === 'failed') {
            showToast('Transaction marked as failed by the admin.', 'error');
          } else {
            showToast(`Delivery #${id}: ${status}`, type);
          }
          setLastRequestUpdate(Date.now());
        });

        socket.on('notification-added', (data: any) => {
          console.log('New notification added event received');
          if (data.message) {
            showToast(data.message, 'info');
          }
          setLastRequestUpdate(Date.now());
        });

        socket.on('new_assignment', (data: any) => {
          console.log('New assignment event received');
          const id = data.request_id?.slice(-6).toUpperCase() || '---';
          showToast(`Job #${id} assigned to ${data.rider_name || 'Rider'}`, 'success');
          setLastRequestUpdate(Date.now());
        });

        socket.on('exception-detected', (data: any) => {
          console.log('System exception detected');
          showToast(`ALERT: Exception on Req #${data.requestId?.slice(-6).toUpperCase()}`, 'warning');
          setLastRequestUpdate(Date.now());
        });

        socket.on('exception-cleared', (data: any) => {
          console.log('System exception cleared');
          setLastRequestUpdate(Date.now());
        });
      } catch (err) {
        console.error('Failed to initialize socket:', err);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isAuthenticated, token, user]);

  return (
    <RealTimeContext.Provider value={{ riderLocations, riderPresence, isConnected, lastRequestUpdate, toast, showToast, hideToast }}>
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
