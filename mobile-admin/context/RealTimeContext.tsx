import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../constants/Config';
import { useAuth } from './AuthContext';
import { useRealTimeStore } from '../store/useRealTimeStore';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

const isAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();
// The package barrel registers a push-token listener at module load. Android Expo Go
// throws from that listener, so notification tray alerts are skipped there.
const Notifications = isAndroidExpoGo
  ? undefined
  : (require('expo-notifications') as typeof import('expo-notifications'));

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

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const {
    setRiderLocations,
    setRiderPresence,
    setConnectionState,
    triggerRequestUpdate,
    showToast,
  } = useRealTimeStore();

  useEffect(() => {
    let socket: Socket | null = null;
    let appStateSubscription: { remove: () => void } | null = null;

    if (!isAuthenticated || !token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionState(false);
      setRiderLocations(() => new Map());
      setRiderPresence(new Map());
      return;
    }

    const initSocket = () => {
      try {
        console.log('Connecting to socket with token at:', CONFIG.SOCKET_URL);
        socket = io(CONFIG.SOCKET_URL, {
          transports: ['websocket'],
          autoConnect: true,
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Admin socket connected');
          setConnectionState(true);
          triggerRequestUpdate();
          
          if (user.role === 'admin') {
            console.log('Joining admin-room');
            socket?.emit('join-room', 'admin-room');
          } else {
            console.log(`User role ${user.role} not authorized for admin-room`);
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('Admin socket disconnected:', reason);
          setConnectionState(false);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          if (error.message === 'Authentication error: Invalid token') {
            console.log('Socket token rejected by server.');
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
          // Inzustand we need to pass a new map. Wait, let's use useRealTimeStore.getState()
          const currentPresence = useRealTimeStore.getState().riderPresence;
          const next = new Map(currentPresence);
          next.set(data.riderId, data.status);
          setRiderPresence(next);
        });

        const triggerPushNotification = async (title: string, body: string, data: Record<string, string> = {}) => {
          // The in-app toast above remains available in Expo Go; skip system alerts.
          if (!Notifications) return;

          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                sound: 'default',
                data,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(),
                channelId: 'delivery-updates',
              },
            });
          } catch (error) {
            console.log('Notification skipped (unsupported in Expo Go Android):', title);
          }
        };

        socket.on('request-updated', (data: any) => {
          console.log('Request updated event received');
          const id = data.request_id?.slice(-6).toUpperCase() || '---';
          const status = data.status?.replace('_', ' ').toUpperCase() || 'UPDATED';
          showToast(`Request #${id} is now ${status}`, 'info');
          triggerPushNotification('Request Updated', `Request #${id} is now ${status}`);
          triggerRequestUpdate();
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
          triggerPushNotification(
            `Delivery ${status}`,
            `Delivery #${id} status changed to ${status}`,
            { requestId: data.request_id || '' },
          );
          triggerRequestUpdate();
        });

        socket.on('notification-added', (data: any) => {
          console.log('New notification added event received');
          if (data.message) {
            showToast(data.message, 'info');
            triggerPushNotification('New Notification', data.message);
          }
          triggerRequestUpdate();
        });

        socket.on('new_assignment', (data: any) => {
          console.log('New assignment event received');
          const id = data.request_id?.slice(-6).toUpperCase() || '---';
          showToast(`Job #${id} assigned to ${data.rider_name || 'Rider'}`, 'success');
          triggerPushNotification('New Assignment', `Job #${id} assigned to ${data.rider_name || 'Rider'}`);
          triggerRequestUpdate();
        });

        socket.on('exception-detected', (data: any) => {
          console.log('System exception detected');
          showToast(`ALERT: Exception on Req #${data.requestId?.slice(-6).toUpperCase()}`, 'warning');
          triggerPushNotification('⚠️ System Alert', `Exception on Request #${data.requestId?.slice(-6).toUpperCase()}`);
          triggerRequestUpdate();
        });

        socket.on('exception-cleared', (data: any) => {
          console.log('System exception cleared');
          triggerRequestUpdate();
        });

        appStateSubscription = AppState.addEventListener('change', (nextState) => {
          if (nextState === 'active') {
            socket?.connect();
            triggerRequestUpdate();
          }
        });
      } catch (err) {
        console.error('Failed to initialize socket:', err);
      }
    };

    initSocket();

    return () => {
      appStateSubscription?.remove();
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isAuthenticated, token, user, setRiderLocations, setRiderPresence, setConnectionState, triggerRequestUpdate, showToast]);

  return <>{children}</>;
};
