import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { getLocalDateStr, formatDisplayDate } from '@/utils/dateUtils';
import { getRiderTaskSequenceLabel, getRiderTasksForTab, isTaskLocked } from '@/utils/taskFilters';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';
import { ShiftControlDrawer } from '@/components/ShiftControlDrawer';
import { TaskTabEmptyState } from '@/components/TaskTabEmptyState';
import { RiderSurfaceGradient } from '@/components/RiderSurfaceGradient';
import { TaskDetailIcon } from '@/components/jobs/TaskDetailIcon';
import { useLocation } from '@/context/LocationContext';
import { ShiftTaskAccessNotice } from '@/components/jobs/ShiftTaskAccessNotice';

export default function TomorrowScreen() {
  const { isOnDuty, hasOpenShift, isShiftStatusReady, isNetworkReachable, shiftHoursLocked } = useLocation();
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
    router,
  } = useDashboard();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateLabel = formatDisplayDate(getLocalDateStr(tomorrow));
  const canShowAssignments = isShiftStatusReady && hasOpenShift && isOnDuty && !shiftHoursLocked && isNetworkReachable !== false;
  const tasks = canShowAssignments ? getRiderTasksForTab(allTasks, 'tomorrow') : [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RiderSurfaceGradient />
      <ScreenHeader
        variant="hero"
        title="Upcoming Jobs"
        subtitle={`Scheduled from ${tomorrowDateLabel} onward`}
        badgeLabel="UPCOMING"
        badgeStatus="info"
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} tintColor="#3B82F6" />}
      >
        {canShowAssignments && loading && !refreshing ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !canShowAssignments ? (
          <ShiftTaskAccessNotice title="Upcoming tasks are locked" message={shiftHoursLocked ? 'Shift hours are closed. Return during your next shift.' : 'Press On Duty to record attendance and reveal your upcoming assignments.'} />
        ) : tasks.length === 0 ? (
          <TaskTabEmptyState
            variant="upcoming"
            icon={<MaterialIcons name="event-available" size={40} color="#3B82F6" />}
            title={isShiftStatusReady ? "No upcoming jobs scheduled" : 'Checking your shift status'}
            message={isShiftStatusReady
              ? hasOpenShift ? 'Pull down to check for schedule updates.' : 'Start your shift to reveal your upcoming assignments.'
              : 'Upcoming jobs will appear after the server confirms your shift and availability.'}
          />
        ) : (
          <>
          {tasks.map((task, index) => {
            const isLocked = isTaskLocked(task, allTasks);
            const buildingName = task.dropoff_location?.businessName || task.pickup_location?.businessName || 'Building not provided';

            return (
              <Card key={task.request_id} style={{ ...styles.card, ...(isLocked ? styles.lockedCard : {}), ...(!isOnDuty ? styles.offDutyTaskCard : {}) }}>
                <TouchableOpacity
                  testID={`tomorrow_task_card_${index}`}
                  activeOpacity={0.7}
                  disabled={!isOnDuty && task.delivery_status !== 'in_progress'}
                  onPress={() => router.push(`/job/${task.request_id}`)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleBlock}>
                      <View style={styles.sequenceRow}>
                        <Text style={styles.sequenceLabel}>{getRiderTaskSequenceLabel(task, allTasks)}</Text>
                        {isLocked && <MaterialIcons name="lock" size={14} color="#B45309" />}
                      </View>
                      <View style={styles.buildingRow}>
                        <MaterialIcons name="business" size={16} color="#2563EB" />
                        <Text style={styles.buildingName} numberOfLines={1}>{buildingName}</Text>
                      </View>
                    </View>
                    <Badge label={(task.delivery_status || 'PENDING').toUpperCase()} status={task.delivery_status === 'in_progress' ? 'warning' : 'info'} />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <TaskDetailIcon name="location-on" iconColor="#059669" backgroundColor="#D1FAE5" />
                    <Text style={styles.detailText} numberOfLines={2}>{task.dropoff_location?.address || 'Drop-off address not provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <TaskDetailIcon name="person" iconColor="#7C3AED" backgroundColor="#EDE9FE" />
                    <Text style={styles.detailText} numberOfLines={1}>{task.recipient_name || 'Recipient not provided'}</Text>
                  </View>

                  <View style={styles.footer}>
                    <View style={styles.timeRow}>
                      <MaterialIcons name="schedule" size={14} color="#64748B" />
                      <Text style={styles.timeText}>{task.time_window || 'Time not set'}</Text>
                    </View>
                    <View style={styles.action}>
                      <Text style={styles.actionText}>{isLocked ? 'View Details' : 'View Job'}</Text>
                      <MaterialIcons name="arrow-forward" size={14} color="#3B82F6" />
                    </View>
                  </View>
                </TouchableOpacity>
              </Card>
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
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: scale(16), paddingBottom: verticalScale(40), flexGrow: 1 },
  card: { marginBottom: verticalScale(10), padding: moderateScale(14) },
  lockedCard: { backgroundColor: '#FAFAFA', opacity: 0.85, borderColor: '#F1F5F9' },
  offDutyTaskCard: { backgroundColor: '#F8FAFC', opacity: 0.62, borderColor: '#CBD5E1' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(10) },
  titleBlock: { flex: 1, minWidth: 0, marginRight: scale(8) },
  sequenceRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), marginBottom: verticalScale(4) },
  sequenceLabel: { fontSize: normalizeFontSize(9), fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
  buildingRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
  buildingName: { flex: 1, fontSize: normalizeFontSize(15), fontWeight: '900', color: '#1D4ED8' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: verticalScale(10) },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(8) },
  detailText: { flex: 1, fontSize: normalizeFontSize(13), color: '#475569', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: verticalScale(9), marginTop: verticalScale(2) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), flex: 1 },
  timeText: { fontSize: normalizeFontSize(12), fontWeight: '700', color: '#475569' },
  action: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  actionText: { fontSize: normalizeFontSize(12), fontWeight: '700', color: '#3B82F6' },
});
