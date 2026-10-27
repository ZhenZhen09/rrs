import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTasks, getHistoryTasks, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { Job } from '@/types';
import { getLocalDateStr } from '@/utils/dateUtils';
import { getRiderStatusActions } from '@/services/syncQueue';

export const useDashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Use TanStack Query for Tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isFetching: tasksFetching,
    error: tasksError,
    refetch: refetchTasks,
    isRefetching: refreshing,
  } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => getTasks(user!.id),
    enabled: !!user?.id,
  });

  const {
    data: historyTasks = [],
    isLoading: historyLoading,
    refetch: refetchHistoryTasks,
    isRefetching: historyRefreshing,
  } = useQuery({
    queryKey: ['historyTasks', user?.id],
    queryFn: getHistoryTasks,
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

  // A screen should only replace its content with skeletons for the first task
  // load. History and notifications refresh independently and must not cause
  // the Today task list to flicker.
  const loading = tasksLoading;

  const handleLogout = async () => {
    const pendingActions = user?.id
      ? (await getRiderStatusActions(user.id)).filter((action) => action.state !== 'acked')
      : [];
    if (pendingActions.length > 0) {
      Alert.alert(
        'Delivery updates still need syncing',
        `${pendingActions.length} saved update${pendingActions.length === 1 ? '' : 's'} will remain on this device and stay hidden until you sign back in as this rider.`,
        [
          { text: 'Keep working', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
        ],
      );
      return;
    }
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

  // --- SENIOR NOTE: Socket logic has been moved to LocationContext (Global Scope) ---
  // This hook now relies on global query invalidation for reactivity.

  const onRefresh = useCallback(() => {
    refetchTasks();
    refetchHistoryTasks();
    refetchNotifs();
  }, [refetchTasks, refetchHistoryTasks, refetchNotifs]);

  return {
    user,
    loading,
    tasks,
    tasksLoading,
    tasksFetching,
    tasksError,
    retryTasks: refetchTasks,
    historyTasks,
    historyLoading,
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
    refreshing: refreshing || historyRefreshing,
    router,
  };
};
