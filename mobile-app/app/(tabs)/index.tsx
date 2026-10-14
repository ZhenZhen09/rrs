import React from 'react';
import { Animated, StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { getRiderTaskSequenceLabel, getRiderTaskTab, isTaskLocked } from '@/utils/taskFilters';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';
import { useLocation } from '@/context/LocationContext';
import { ShiftControlDrawer } from '@/components/ShiftControlDrawer';
import { RiderSurfaceGradient } from '@/components/RiderSurfaceGradient';
import { getTodayEmptyStateTopPadding } from '@/utils/todayEmptyStateLayout';
import { formatOverdueDuration } from '@/utils/eta';
import { TaskDetailIcon } from '@/components/jobs/TaskDetailIcon';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

export default function TodayScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotionPreference();
  const [dashboardEntrance] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (reduceMotion) {
      dashboardEntrance.setValue(1);
      return;
    }

    const frame = requestAnimationFrame(() => {
      Animated.timing(dashboardEntrance, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
    return () => cancelAnimationFrame(frame);
  }, [dashboardEntrance, reduceMotion]);
  const { isOnDuty, hasOpenShift, attendanceStatus, isShiftStatusReady } = useLocation();

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

  const tasks = allTasks.filter(req => getRiderTaskTab(req) === 'today');
  const orderedTasks = React.useMemo(() => [...tasks].sort((a, b) => {
    const orderA = a.queue_order || 999;
    const orderB = b.queue_order || 999;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  }), [tasks]);
  const upcomingCount = allTasks.filter(req => {
    const tab = getRiderTaskTab(req);
    return tab === 'tomorrow' || tab === 'future';
  }).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RiderSurfaceGradient />
      <ScreenHeader 
        variant="hero"
        title="Today's Tasks"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        onNotifPress={() => setIsNotifOpen(true)}
        onSettingsPress={() => router.push('/settings')}
        onLogoutPress={handleLogout}
        profileName={user?.name}
        profileAvatarId={user?.avatar_id ?? user?.avatarId}
        unreadCount={unreadCount}
      />
      <ShiftControlDrawer tasks={allTasks} />

      {!isShiftStatusReady ? (
        <View style={styles.shiftStatusLoading} accessibilityRole="progressbar" accessibilityLabel="Checking shift status">
          <ActivityIndicator color="#10B981" />
        </View>
      ) : !isOnDuty ? (
        <View style={styles.offDutyContainer}>
          <View style={styles.offDutyIconCircle}>
            <MaterialIcons name="power-settings-new" size={40} color="#94A3B8" />
          </View>
          <Text style={styles.offDutyTitle}>{hasOpenShift ? 'You are offline' : attendanceStatus === 'present' ? 'Your Shift Has Ended' : 'You are currently Off Duty'}</Text>
          <Text style={styles.offDutyText}>
            {hasOpenShift
              ? 'Your shift remains active while you are offline. You will not receive new delivery requests.'
              : attendanceStatus === 'present'
                ? 'You have ended today’s shift. Your attendance and recorded hours are saved.'
                : attendanceStatus === 'absent' || attendanceStatus === 'on_leave'
                  ? 'Your attendance is recorded as absent or on leave. Contact Admin if this needs to change.'
                : 'Start your shift to record today’s attendance and become available for delivery requests.'}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#10B981']}
              tintColor={'#10B981'}
            />
          }
        >
          {loading && !refreshing ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : tasks.length === 0 ? (
            <View
              testID="today-empty-state"
              style={[
                styles.empty,
                {
                  paddingTop: verticalScale(getTodayEmptyStateTopPadding(screenHeight)),
                  paddingBottom: 0,
                },
              ]}
            >
              <EmptyStateIllustration />
              <Text style={styles.emptyTitle}>All caught up for today!</Text>
              <Text style={styles.emptyText}>
                {upcomingCount > 0
                  ? `You have ${upcomingCount} upcoming job(s). Check the 'Upcoming' tab to see them.`
                  : "No tasks are assigned to you right now."}
              </Text>
              <View style={styles.pullGuide}>
                {refreshing ? (
                  <>
                    <ActivityIndicator size="small" color="#10B981" />
                    <Text style={styles.pullGuideText}>Syncing tasks...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="arrow-downward" size={19} color="#8396AF" />
                    <Text style={styles.pullGuideText}>Swipe down to sync</Text>
                  </>
                )}
              </View>
            </View>
          ) : (
            orderedTasks.map((task, index) => {
              const isLocked = isTaskLocked(task, allTasks);
              const buildingName = task?.dropoff_location?.businessName || task?.pickup_location?.businessName || 'Building not provided';
              const personnelNote = task?.personnel_instructions || 'No personnel note provided';
              const adminNote = task?.admin_remark || 'No admin note provided';
              return (
                <Animated.View
                  key={task.request_id}
                  style={{ opacity: dashboardEntrance, transform: [{ translateY: dashboardEntrance.interpolate({ inputRange: [0, 1], outputRange: [6 + Math.min(index * 2, 6), 0] }) }] }}
                >
                <Card style={{ ...styles.card, ...(isLocked ? styles.lockedCard : {}) }}>
                  <TouchableOpacity
                    testID={`today_task_card_${index}`}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/job/${task.request_id}`)}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <View style={styles.sequenceBadgeRow}>
                          <View style={styles.taskNumberBadge}>
                            <Text style={styles.taskNumberText}>{getRiderTaskSequenceLabel(task, allTasks)}</Text>
                          </View>
                          <View style={[styles.sequenceBadge, isLocked ? styles.queuedBadge : styles.nextBadge]}>
                            <Text style={[styles.sequenceBadgeText, isLocked ? styles.queuedBadgeText : styles.activeBadgeText]}>{isLocked ? 'QUEUED' : 'NEXT TASK'}</Text>
                          </View>
                          {isLocked && <MaterialIcons name="lock" size={14} color="#B45309" />}
                        </View>
                        <View style={styles.buildingHeadline}>
                          <MaterialIcons name="business" size={16} color="#2563EB" />
                          <Text style={styles.buildingHeadlineText} numberOfLines={1}>{buildingName}</Text>
                        </View>
                      </View>
                      <Badge label={(task?.delivery_status || 'PENDING').toUpperCase()} status={task?.delivery_status === 'in_progress' ? 'warning' : 'info'} />
                    </View>

                    {(task.state === 'At Risk' || task.state === 'Overdue') && task.scheduled_end_at && (
                      <View style={styles.deadlineNotice}>
                        <Text style={[styles.deadlineBadge, task.state === 'Overdue' && styles.overdueDeadlineBadge]}>
                          {task.state === 'Overdue' ? 'OVERDUE' : 'AT RISK'}
                        </Text>
                        <Text style={styles.deadlineNoticeText}>
                          Due {new Date(task.scheduled_end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          {' · '}{task.state === 'Overdue' ? (task.overdue_label || `${formatOverdueDuration(task.overdue_minutes || 0)} overdue`) : `${task.remaining_minutes || 0} min remaining`}
                        </Text>
                      </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.details}>
                      <View style={styles.infoRow}>
                        <TaskDetailIcon name="tag" size={14} iconColor="#475569" backgroundColor="#E2E8F0" />
                        <View style={styles.infoContent}><Text style={styles.infoLabel}>REQUEST #</Text><Text style={styles.infoValue} numberOfLines={1}>{task?.request_id || 'Request number not provided'}</Text></View>
                      </View>
                      <View style={styles.infoRow}>
                        <TaskDetailIcon name="location-on" iconColor="#059669" backgroundColor="#D1FAE5" />
                        <View style={styles.infoContent}><Text style={styles.infoLabel}>DROP-OFF ADDRESS</Text><Text style={styles.infoValue} numberOfLines={2}>{task?.dropoff_location?.address || 'Drop-off address not provided'}</Text></View>
                      </View>
                      <View style={styles.infoRow}>
                        <TaskDetailIcon name="person" iconColor="#7C3AED" backgroundColor="#EDE9FE" />
                        <View style={styles.infoContent}><Text style={styles.infoLabel}>RECIPIENT</Text><Text style={styles.infoValue} numberOfLines={1}>{task?.recipient_name || 'Recipient not provided'}</Text></View>
                      </View>
                      <View style={styles.infoGrid}>
                        <View style={styles.infoGridItem}>
                          <TaskDetailIcon name="description" size={14} iconColor="#D97706" backgroundColor="#FEF3C7" />
                          <View style={styles.infoContent}><Text style={styles.infoLabel}>PERSONNEL NOTE</Text><Text style={styles.noteValue} numberOfLines={2}>{personnelNote}</Text></View>
                        </View>
                        <View style={styles.infoGridItem}>
                          <TaskDetailIcon name="admin-panel-settings" size={14} iconColor="#475569" backgroundColor="#E2E8F0" />
                          <View style={styles.infoContent}><Text style={styles.infoLabel}>ADMIN NOTE</Text><Text style={styles.noteValue} numberOfLines={2}>{adminNote}</Text></View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.footer}>
                      <View style={styles.riderInfo}><MaterialIcons name="schedule" size={14} color="#64748B" /><Text style={styles.recipientName}>{task?.time_window || 'Time not set'}</Text></View>
                      <View style={styles.action}>
                          <Text style={[styles.actionText, isLocked && { color: '#94A3B8' }]}>{isLocked ? 'View Details' : 'Start Task'}</Text>
                          <MaterialIcons name="arrow-forward" size={14} color={isLocked ? "#94A3B8" : "#3B82F6"} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}

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

function EmptyStateIllustration() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.emptyIllustration}>
      <View style={styles.illustrationHalo} />
      <View style={styles.illustrationCloudOne} />
      <View style={styles.illustrationCloudTwo} />
      <View style={styles.illustrationGround} />
      <View style={styles.clipboardCard}>
        <View style={styles.clipboardClip} />
        <MaterialIcons name="fact-check" size={72} color="#4B91E8" />
      </View>
      <View style={styles.helmetOrb}>
        <MaterialIcons name="sports-motorsports" size={52} color="#0D7890" />
      </View>
      <View style={styles.sparkleOne} />
      <View style={styles.sparkleTwo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  offDutyContainer: {
    flex: 1,
    backgroundColor: '#F8FAFD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
  },
  shiftStatusLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offDutyIconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  offDutyTitle: {
    fontSize: normalizeFontSize(18),
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  offDutyText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(8),
    lineHeight: 20,
  },
  scrollContent: {
    flexGrow: 1,
    padding: scale(16),
    paddingBottom: verticalScale(24),
  },
  scrollView: {
    backgroundColor: 'transparent',
  },
  card: {
    marginBottom: verticalScale(14),
    padding: moderateScale(16),
    borderRadius: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  timeLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  timeWindow: {
    fontSize: normalizeFontSize(13),
    fontWeight: '700',
    color: '#475569',
    marginTop: verticalScale(2),
  },
  buildingHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: scale(210),
    marginTop: verticalScale(3),
    gap: scale(5),
  },
  buildingHeadlineText: {
    flex: 1,
    fontSize: normalizeFontSize(15),
    fontWeight: '900',
    color: '#102744',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(8),
  },
  deadlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
  },
  deadlineBadge: { color: '#B45309', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  overdueDeadlineBadge: { color: '#B91C1C' },
  deadlineNoticeText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  details: {
    marginBottom: verticalScale(8),
  },
  infoGrid: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(7),
  },
  infoGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(7),
  },
  infoContent: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: normalizeFontSize(9),
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.55,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: normalizeFontSize(13),
    lineHeight: normalizeFontSize(17),
    color: '#334155',
    fontWeight: '700',
  },
  noteValue: {
    fontSize: normalizeFontSize(12),
    lineHeight: normalizeFontSize(16),
    color: '#64748B',
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
  },
  addressIconColumn: {
    alignItems: 'center',
    width: scale(20),
    marginRight: scale(8),
    paddingVertical: verticalScale(4),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  addressTextColumn: {
    flex: 1,
  },
  address: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: verticalScale(8),
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipientName: {
    fontSize: normalizeFontSize(13),
    fontWeight: '600',
    color: '#475569',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#3B82F6',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(320),
    flex: 1,
    paddingVertical: verticalScale(20),
    paddingBottom: verticalScale(24),
    zIndex: 1,
  },
  emptyTitle: {
    fontSize: normalizeFontSize(24),
    fontWeight: '800',
    color: '#0B2142',
    marginTop: verticalScale(12),
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: normalizeFontSize(15),
    lineHeight: normalizeFontSize(21),
    color: '#63758F',
    marginTop: verticalScale(4),
    textAlign: 'center',
    paddingHorizontal: scale(22),
    maxWidth: 360,
    marginBottom: verticalScale(16),
  },
  emptyIllustration: {
    width: scale(190),
    height: verticalScale(156),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(4),
  },
  illustrationHalo: {
    position: 'absolute',
    top: 0,
    width: scale(144),
    height: scale(144),
    borderRadius: scale(72),
    backgroundColor: '#EAF2FF',
  },
  illustrationCloudOne: {
    position: 'absolute',
    left: scale(4),
    top: verticalScale(47),
    width: scale(47),
    height: verticalScale(15),
    borderRadius: 10,
    backgroundColor: '#DDEBFC',
    opacity: 0.8,
  },
  illustrationCloudTwo: {
    position: 'absolute',
    right: scale(4),
    top: verticalScale(31),
    width: scale(40),
    height: verticalScale(13),
    borderRadius: 10,
    backgroundColor: '#DDEBFC',
    opacity: 0.7,
  },
  illustrationGround: {
    position: 'absolute',
    bottom: verticalScale(5),
    width: scale(210),
    height: verticalScale(42),
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: '#F0F6FE',
  },
  clipboardCard: {
    position: 'absolute',
    left: scale(28),
    top: verticalScale(43),
    width: scale(88),
    height: verticalScale(106),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#8ABCF4',
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#377EC8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 4,
  },
  clipboardClip: {
    position: 'absolute',
    top: -8,
    width: scale(40),
    height: verticalScale(14),
    borderRadius: 7,
    backgroundColor: '#4B91E8',
  },
  helmetOrb: {
    position: 'absolute',
    right: scale(20),
    bottom: verticalScale(8),
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDF8ED',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#0B5967',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  sparkleOne: {
    position: 'absolute',
    top: verticalScale(65),
    right: scale(31),
    width: 10,
    height: 10,
    backgroundColor: '#FDE68A',
    transform: [{ rotate: '45deg' }],
  },
  sparkleTwo: {
    position: 'absolute',
    top: verticalScale(28),
    left: scale(61),
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9FC9F5',
  },
  pullGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: verticalScale(12),
  },
  pullGuideText: {
    fontSize: normalizeFontSize(15),
    color: '#8396AF',
    fontWeight: '600',
  },
  // LAYER 2 STYLES
  lockedCard: {
    backgroundColor: '#FAFAFA',
    opacity: 0.85,
    borderColor: '#F1F5F9',
  },
  sequenceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: verticalScale(4),
  },
  sequenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  taskNumberBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  taskNumberText: {
    fontSize: normalizeFontSize(10),
    fontWeight: '900',
    letterSpacing: 0.55,
    color: '#FFFFFF',
  },
  nextBadge: {
    backgroundColor: '#ECFDF5',
  },
  queuedBadge: {
    backgroundColor: '#FFFBEB',
  },
  sequenceBadgeText: {
    fontSize: normalizeFontSize(8),
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeBadgeText: {
    color: '#059669',
  },
  queuedBadgeText: {
    color: '#D97706',
  }
});
