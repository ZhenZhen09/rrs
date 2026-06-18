import React from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { getLocalDateStr, formatDisplayDate } from '@/utils/dateUtils';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { NotificationModal } from '@/components/NotificationModal';

export default function TomorrowScreen() {
  const { 
    refreshing,
    onRefresh,
    notifications,
    unreadCount, 
    isNotifOpen, 
    setIsNotifOpen, 
    handleLogout, 
    handleNotificationClick, 
    handleMarkAllRead
  } = useDashboard();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);
  const tomorrowDateLabel = formatDisplayDate(tomorrowStr);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader 
        title="Tomorrow's Jobs"
        subtitle={`Scheduled for ${tomorrowDateLabel}`}
        badgeLabel="UPCOMING"
        badgeStatus="info"
        onNotifPress={() => setIsNotifOpen(true)}
        onLogoutPress={handleLogout}
        unreadCount={unreadCount}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconCircle}>
            <MaterialIcons name="lock" size={scale(48)} color="#3B82F6" />
            <View style={styles.clockOverlay}>
              <Ionicons name="time" size={scale(20)} color="white" />
            </View>
          </View>
          
          <Text style={styles.lockedTitle}>Schedule Locked</Text>
          <Text style={styles.lockedText}>
            Tomorrow&apos;s missions are being optimized by Dispatch.
          </Text>
          
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#64748B" />
            <Text style={styles.infoText}>
              Revealed at 06:00 AM after your morning check-in.
            </Text>
          </View>
        </View>
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
    flexGrow: 1,
    padding: scale(20),
    justifyContent: 'center',
  },
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(40),
  },
  lockIconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
    position: 'relative',
  },
  clockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  lockedTitle: {
    fontSize: normalizeFontSize(22),
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: verticalScale(8),
    letterSpacing: -0.5,
  },
  lockedText: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: verticalScale(20),
    paddingHorizontal: scale(20),
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(12),
    marginTop: verticalScale(32),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoText: {
    fontSize: normalizeFontSize(11),
    fontWeight: '700',
    color: '#64748B',
    marginLeft: scale(8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});
