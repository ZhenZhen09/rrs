import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTasks, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';
import { usePushNotifications } from '@/hooks/use-push-notifications';

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

  // --- SENIOR NOTE: Socket logic has been moved to LocationContext (Global Scope) ---
  // This hook now relies on global query invalidation for reactivity.

  const onRefresh = useCallback(() => {
    refetchTasks();
    refetchNotifs();
  }, [refetchTasks, refetchNotifs]);

  return {
    user,
    loading,
    tasks,
    error: null,
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
