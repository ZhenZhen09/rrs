import React from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale } from '@/utils/responsive';
import { getRiderTaskTab, isTaskLocked } from '@/utils/taskFilters';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';
import { ShiftControlDrawer } from '@/components/ShiftControlDrawer';
import { TaskTabEmptyState } from '@/components/TaskTabEmptyState';
import { RiderSurfaceGradient } from '@/components/RiderSurfaceGradient';
import { OverdueTaskCard } from '@/components/jobs/OverdueTaskCard';
import { useLocation } from '@/context/LocationContext';
import { ShiftTaskAccessNotice } from '@/components/jobs/ShiftTaskAccessNotice';

export default function OverdueScreen() {
  const { isOnDuty, hasOpenShift, isShiftStatusReady, isNetworkReachable, shiftHoursLocked } = useLocation();
  // --- SENIOR REFACTOR: USE REACTIVE HOOK ---
  const { 
    user,
    tasks: allTasks,
    loading,
    refreshing,
    onRefresh,
    notifications,
    unreadCount, 
    isNotifOpen, 
    setIsNotifOpen, 
    handleLogout, 
    handleNotificationClick, 
    handleMarkAllRead,
    router
  } = useDashboard();

  const canShowAssignments = isShiftStatusReady && hasOpenShift && isOnDuty && !shiftHoursLocked && isNetworkReachable !== false;
  const tasks = canShowAssignments ? allTasks
    .filter(req => getRiderTaskTab(req) === 'overdue')
    .sort((a, b) => {
      const orderA = a.queue_order || 999;
      const orderB = b.queue_order || 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RiderSurfaceGradient />
      <ScreenHeader 
        variant="hero"
        title="Overdue Tasks"
        subtitle="Items from previous days"
        badgeLabel="OVERDUE"
        badgeStatus="danger"
        onNotifPress={() => setIsNotifOpen(true)}
        onSettingsPress={() => router.push('/settings')}
        onLogoutPress={handleLogout}
        profileName={user?.name}
        profileAvatarId={user?.avatar_id ?? user?.avatarId}
        unreadCount={unreadCount}
      />
      <ShiftControlDrawer tasks={allTasks} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {canShowAssignments && loading && !refreshing ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !canShowAssignments ? (
          <ShiftTaskAccessNotice title="Overdue tasks are locked" message={shiftHoursLocked ? 'Shift hours are closed. Return during your next shift.' : 'Press On Duty to record attendance and reveal your overdue assignments.'} />
        ) : tasks.length === 0 ? (
          <TaskTabEmptyState
            variant="overdue"
            icon={<MaterialIcons name="check-circle" size={40} color="#10B981" />}
            title={isShiftStatusReady ? isOnDuty ? 'All caught up!' : hasOpenShift ? 'No overdue tasks' : 'Start your shift to see tasks' : 'Checking your shift status'}
            message={isShiftStatusReady
              ? 'You have no overdue tasks.'
              : 'Tasks will appear after the server confirms your shift and availability.'}
          />
        ) : (
          <>
          {tasks.map((task, index) => {
            const isLocked = isTaskLocked(task, allTasks);
            
            return (
              <OverdueTaskCard
                key={task.request_id}
                task={task}
                index={index}
                allTasks={allTasks}
                isLocked={isLocked}
                isAvailable={isOnDuty || task.delivery_status === 'in_progress'}
                onPress={() => router.push(`/job/${task.request_id}`)}
              />
            );
          })}
          </>
        )}
      </ScrollView>

      <NotificationModal 
        visible={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
    flexGrow: 1,
  },
});
