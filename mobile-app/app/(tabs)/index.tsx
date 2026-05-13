import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { getLocalDateStr } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';

export default function TodayScreen() {
  // --- SENIOR REFACTOR: USE REACTIVE HOOK ---
  const { 
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

  // Filter for today's active tasks
  const todayStr = getLocalDateStr(new Date());
  const tasks = allTasks.filter(req => {
    const isToday = getLocalDateStr(req.delivery_date) === todayStr;
    const isApproved = req.status === 'approved';
    const isActive = !['completed', 'delivered', 'failed', 'cancelled'].includes(req.delivery_status);
    return isToday && isApproved && isActive;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader 
        title="Today's Tasks"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        badgeLabel="LIVE"
        badgeStatus="success"
        onNotifPress={() => setIsNotifOpen(true)}
        onLogoutPress={handleLogout}
        unreadCount={unreadCount}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : tasks.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="fact-check" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No tasks for today</Text>
            <Text style={styles.emptyText}>Enjoy your day or check other tabs for pending items.</Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <Card key={task.request_id} style={styles.card}>
              <TouchableOpacity
                testID={`today_task_card_${index}`}
                activeOpacity={0.7}
                onPress={() => router.push(`/job/${task.request_id}`)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.timeLabel}>PICKUP WINDOW</Text>
                    <Text style={styles.timeWindow}>{task?.time_window || 'Not set'}</Text>
                  </View>
                  <Badge label={(task?.delivery_status || 'PENDING').toUpperCase()} status={task?.delivery_status === 'in_progress' ? 'warning' : 'info'} />
                </View>

                <View style={styles.divider} />

                <View style={styles.details}>
                  <View style={styles.addressRow}>
                    <View style={styles.addressIconColumn}>
                      <View style={styles.dot} />
                      <View style={styles.line} />
                      <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <View style={styles.addressTextColumn}>
                      <Text style={styles.address} numberOfLines={1}>{task?.pickup_location?.address || 'Pickup address'}</Text>
                      <Text style={[styles.address, { marginTop: verticalScale(12) }]} numberOfLines={1}>{task?.dropoff_location?.address || 'Dropoff address'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.footer}>
                   <View style={styles.riderInfo}>
                      <MaterialIcons name="person" size={14} color="#64748B" />
                      <Text style={styles.recipientName}>{task?.recipient_name || 'Recipient'}</Text>
                   </View>
                   <View style={styles.action}>
                      <Text style={styles.actionText}>Start Task</Text>
                      <MaterialIcons name="arrow-forward" size={14} color="#3B82F6" />
                   </View>
                </View>
              </TouchableOpacity>
            </Card>
          ))
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: verticalScale(40),
  },
  card: {
    marginBottom: verticalScale(16),
    padding: moderateScale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  timeLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  timeWindow: {
    fontSize: normalizeFontSize(16),
    fontWeight: '800',
    color: '#0F172A',
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(12),
  },
  details: {
    marginBottom: verticalScale(16),
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
    paddingTop: verticalScale(12),
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
    paddingVertical: verticalScale(80),
  },
  emptyTitle: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#64748B',
    marginTop: verticalScale(16),
  },
  emptyText: {
    fontSize: normalizeFontSize(14),
    color: '#94A3B8',
    marginTop: verticalScale(4),
    textAlign: 'center',
    paddingHorizontal: scale(40),
  }
});
