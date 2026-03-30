import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTasks, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Config } from '@/constants/Config';

export const useDashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { notification: currentPushNotification } = usePushNotifications(user?.id);
  
  // Use TanStack Query for Tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
    isRefetching: refreshing,
  } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: getTasks,
    enabled: !!user?.id,
    select: (allRequests) => {
      const todayStr = getLocalDateStr(new Date());
      return allRequests.filter((req: Job) => {
        if (req?.assigned_rider_id !== user?.id) return false;
        if (['completed', 'failed', 'cancelled'].includes(req.delivery_status)) return false;
        const dbDateOnly = typeof req.delivery_date === 'string' 
          ? req.delivery_date.substring(0, 10) 
          : getLocalDateStr(req.delivery_date);
        return dbDateOnly === todayStr;
      });
    },
  });

  // Use TanStack Query for Notifications
  const {
    data: notifications = [],
    isLoading: notifsLoading,
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user?.id || ''),
    enabled: !!user?.id,
  });

  const loading = tasksLoading || notifsLoading;
  const socketRef = useRef<Socket | null>(null);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleNotificationClick = async (notif: any) => {
    setIsNotifOpen(false);
    if (!notif?.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        refetchNotifs();
      } catch (e) {
        console.error('Mark read error:', e);
      }
    }
    if (notif?.request_id) {
      router.push(`/job/${notif.request_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      refetchNotifs();
    } catch (e) {
      console.error('Bulk mark read error:', e);
    }
  };

  useEffect(() => {
    if (currentPushNotification) {
      refetchTasks();
      refetchNotifs();
    }
  }, [currentPushNotification, refetchTasks, refetchNotifs]);

  useEffect(() => {
    if (!user?.id) return;
    
    socketRef.current = io(Config.API_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected - Dashboard');
      socket.emit('join', user.id);
    });

    socket.on('new_assignment', (data) => {
      console.log('Socket Update: New task detected');
      // Invalidating the query triggers a background refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
    });

    socket.on('notification-added', (data) => {
      console.log('Socket Update: New notification received');
      refetchNotifs();
      refetchTasks(); // Refetch tasks too as status might have changed
    });

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('new_assignment');
        socket.off('notification-added');
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  const onRefresh = useCallback(() => {
    refetchTasks();
    refetchNotifs();
  }, [refetchTasks, refetchNotifs]);

  return {
    user,
    loading,
    tasks,
    error: null, // TanStack Query handles error states via isError/error, but we keep null for compatibility
    isMenuOpen,
    setIsMenuOpen,
    isNotifOpen,
    setIsNotifOpen,
    notifications,
    unreadCount: notifications.filter((n: any) => !n.is_read).length,
    handleLogout,
    handleNotificationClick,
    handleMarkAllRead,
    onRefresh,
    refreshing,
    router,
  };
};
