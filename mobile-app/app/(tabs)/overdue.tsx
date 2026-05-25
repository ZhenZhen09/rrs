import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { formatDisplayDate } from '@/utils/dateUtils';
import { getRiderTaskTab } from '@/utils/taskFilters';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';

export default function OverdueScreen() {
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

  const tasks = allTasks.filter(req => getRiderTaskTab(req) === 'overdue');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader 
        title="Overdue Tasks"
        subtitle="Items from previous days"
        badgeLabel="OVERDUE"
        badgeStatus="danger"
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
          </>
        ) : tasks.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="check-circle" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>You have no overdue tasks.</Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <Card key={task.request_id} style={styles.card}>
              <TouchableOpacity
                testID={`overdue_task_card_${index}`}
                activeOpacity={0.7}
                onPress={() => router.push(`/job/${task.request_id}`)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateLabel}>SCHEDULED FOR</Text>
                    <Text style={styles.dateText}>{task?.delivery_date ? formatDisplayDate(task.delivery_date) : 'N/A'}</Text>
                  </View>
                  <Badge label="LATE" status="danger" />
                </View>

                <View style={styles.divider} />

                <View style={styles.details}>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={16} color="#EF4444" />
                    <Text style={styles.address} numberOfLines={1}>{task?.dropoff_location?.address || 'Address unavailable'}</Text>
                  </View>
                  <View style={styles.recipientRow}>
                    <MaterialIcons name="person" size={16} color="#64748B" />
                    <Text style={styles.recipient}>{task?.recipient_name || 'No recipient'}</Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.timeWindow}>{task?.time_window || 'No time set'}</Text>
                  <View style={styles.action}>
                    <Text style={styles.actionText}>View</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#3B82F6" />
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
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  card: {
    marginBottom: verticalScale(16),
    padding: moderateScale(16),
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  dateLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(12),
  },
  details: {
    marginBottom: verticalScale(12),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  address: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    marginLeft: scale(8),
    flex: 1,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipient: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    marginLeft: scale(8),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: moderateScale(10),
    borderRadius: moderateScale(8),
  },
  timeWindow: {
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
    color: '#475569',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#3B82F6',
    marginRight: scale(4),
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
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
  }
});
