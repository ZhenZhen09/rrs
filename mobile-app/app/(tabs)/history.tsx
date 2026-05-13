import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { formatDisplayDate, getLocalDateStr } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';

export default function HistoryScreen() {
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

  // Filter terminal statuses for History
  const todayStr = getLocalDateStr(new Date());
  const tasks = allTasks.filter(req => {
    const isTerminal = ['completed', 'delivered', 'cancelled', 'disapproved', 'failed'].includes(req.delivery_status) || 
                       ['cancelled', 'disapproved'].includes(req.status);
    
    return isTerminal;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader 
        title="Delivery History"
        subtitle="Your completed and past tasks"
        badgeLabel="ARCHIVE"
        badgeStatus="info"
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
            <MaterialIcons name="history" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Your completed tasks will appear here.</Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <Card key={task.request_id} style={styles.card}>
              <TouchableOpacity
                testID={`history_task_card_${index}`}
                activeOpacity={0.7}
                onPress={() => router.push(`/job/${task.request_id}`)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateLabel}>COMPLETED ON</Text>
                    <Text style={styles.dateText}>
                      {task?.completed_at ? formatDisplayDate(task.completed_at) : formatDisplayDate(task.delivery_date)}
                    </Text>
                  </View>
                  <Badge 
                    label={task.delivery_status.toUpperCase()} 
                    status={task.delivery_status === 'completed' || task.delivery_status === 'delivered' ? 'success' : 'danger'} 
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.details}>
                  <Text style={styles.address} numberOfLines={1}>{task?.dropoff_location?.address || 'Address'}</Text>
                  <Text style={styles.recipient}>{task?.recipient_name || 'Recipient'}</Text>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.idText}>#{task.request_id.split('_')[1] || task.request_id}</Text>
                  <Text style={styles.actionText}>Details</Text>
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
    marginBottom: verticalScale(12),
    padding: moderateScale(16),
    opacity: 0.9,
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
    color: '#475569',
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
  address: {
    fontSize: normalizeFontSize(14),
    color: '#1E293B',
    fontWeight: '600',
  },
  recipient: {
    fontSize: normalizeFontSize(13),
    color: '#64748B',
    marginTop: verticalScale(4),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(8),
  },
  idText: {
    fontSize: normalizeFontSize(11),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#94A3B8',
    fontWeight: '700',
  },
  actionText: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#3B82F6',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(100),
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
