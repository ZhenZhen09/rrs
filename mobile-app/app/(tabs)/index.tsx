import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, RefreshControl, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/Colors';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useDashboard } from '@/hooks/data/useDashboard';
import Bugsnag from '@bugsnag/expo';

export default function DashboardScreen() {
  const {
    user,
    loading,
    tasks,
    error,
    isMenuOpen,
    setIsMenuOpen,
    isNotifOpen,
    setIsNotifOpen,
    notifications,
    unreadCount,
    handleLogout,
    handleNotificationClick,
    handleMarkAllRead,
    onRefresh,
    refreshing,
    router,
  } = useDashboard();

  const isDark = useThemeColor({ light: '', dark: '' }, 'background') === Colors.dark.background;
  const themeColors = isDark ? Colors.dark : Colors.light;

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
    Linking.openURL(url);
  };

  const openInOSM = (lat: number, lng: number) => {
    // OpenStreetMap directions
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lng}`;
    Linking.openURL(url);
  };

  const callRecipient = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]} edges={['top', 'left', 'right']}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <View style={styles.logoContainer}>
             <MaterialIcons name="directions-bike" size={moderateScale(20)} color="#FFFFFF" />
          </View>
          <View style={styles.appBarTitles}>
             <Text style={styles.appBarTitle}>Rider Scheduling System</Text>
             <Text style={styles.appBarSubtitle}>Rider Dashboard</Text>
          </View>
        </View>
        <View style={styles.appBarRight}>
           <TouchableOpacity 
              style={styles.notificationButton} 
              activeOpacity={0.7}
              onPress={() => setIsNotifOpen(true)}
           >
              <MaterialIcons name="notifications-none" size={22} color="#1E293B" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={styles.profileDropdownTrigger} 
             activeOpacity={0.7}
             onPress={() => setIsMenuOpen(true)}
           >
              <View style={styles.avatarContainer}>
                 <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'R'}</Text>
              </View>
           </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal visible={isNotifOpen} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsNotifOpen(false)}
        >
          <View style={[styles.dropdownMenu, { width: scale(320), right: scale(20) }]}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifHeaderTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.dropdownDivider} />
            <ScrollView style={{ maxHeight: verticalScale(380) }} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifContainer}>
                  <MaterialIcons name="notifications-off" size={moderateScale(48)} color="#E2E8F0" />
                  <Text style={styles.emptyNotifTitle}>No notifications</Text>
                  <Text style={styles.emptyNotifSub}>You're all caught up!</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity 
                    key={notif.id} 
                    style={[styles.notificationItem, !notif.is_read && styles.notificationItemUnread]}
                    onPress={() => handleNotificationClick(notif)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.notifIconContainer, !notif.is_read ? { backgroundColor: '#EFF6FF' } : { backgroundColor: '#F8FAFC' }]}>
                      <MaterialIcons 
                        name="directions-bike" 
                        size={moderateScale(18)} 
                        color={!notif.is_read ? '#3B82F6' : '#94A3B8'} 
                      />
                    </View>
                    <View style={styles.notifTextContainer}>
                      <Text style={[styles.notifMessage, !notif.is_read && styles.notifMessageUnread]} numberOfLines={2}>
                        {notif.message}
                      </Text>
                      <Text style={styles.notifTime}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {!notif.is_read && <View style={styles.notifUnreadIndicator} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isMenuOpen} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMenuOpen(false)}
        >
          <View style={styles.dropdownMenu}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownName} numberOfLines={1}>{user?.name}</Text>
              <Text style={styles.dropdownEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={() => setIsMenuOpen(false)}>
              <MaterialIcons name="person-outline" size={20} color="#475569" />
              <Text style={styles.dropdownItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setIsMenuOpen(false); handleLogout(); }}>
              <MaterialIcons name="logout" size={20} color="#EF4444" />
              <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView 
        style={[styles.container, { backgroundColor: '#F8FAFC' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        <View style={styles.innerContent}>
           <View style={styles.headerRow}>
              <View>
                 <Text style={styles.headerTitle}>My Tasks</Text>
                 <View style={styles.jobCountContainer}>
                    <View style={styles.activeDot} />
                    <Text style={styles.jobCountText}>{tasks.length} JOB{tasks.length !== 1 ? 'S' : ''} TODAY</Text>
                 </View>
              </View>
              <View style={styles.headerActions}>
                 <TouchableOpacity 
                   style={[styles.circleIconButton, { marginRight: scale(8) }]} 
                   activeOpacity={0.7} 
                   onPress={() => {
                     Bugsnag.notify(new Error("Bugsnag Test Error from Dashboard"));
                     alert("Test error sent to Bugsnag!");
                   }}
                 >
                    <MaterialIcons name="bug-report" size={22} color="#EF4444" />
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.circleIconButton} activeOpacity={0.7} onPress={onRefresh}>
                    <MaterialIcons name="sync" size={22} color="#3B82F6" />
                 </TouchableOpacity>
              </View>
           </View>

           {error && (
             <View style={styles.errorBanner}>
               <Text style={styles.errorText}>{error}</Text>
             </View>
           )}

           {loading && !refreshing ? (
             <>
               <SkeletonCard />
               <SkeletonCard />
               <SkeletonCard />
             </>
           ) : tasks.length > 0 ? (
             tasks.map((task) => (
               <View key={task.request_id} style={styles.taskCard}>
                  {task.urgency_level.toLowerCase() === 'urgent' && (
                    <View style={styles.urgentBadge}>
                       <MaterialIcons name="error-outline" size={14} color="#FFFFFF" />
                       <Text style={styles.urgentText}>Urgent</Text>
                    </View>
                  )}

                  <View style={styles.cardHeader}>
                     <View style={styles.timeIconContainer}>
                        <MaterialIcons name="schedule" size={22} color="#1E293B" />
                     </View>
                     <View style={styles.timeInfo}>
                        <Text style={styles.label}>SCHEDULED TIME</Text>
                        <Text style={styles.timeRange}>{task?.time_window || 'No time set'}</Text>
                     </View>
                     <View style={styles.statusSection}>
                        <View style={styles.onWayBadge}>
                           <Text style={styles.onWayText}>{(task?.delivery_status || 'UNKNOWN').toUpperCase()}</Text>
                        </View>
                        {task?.request_type === 'bank' && (
                          <View style={styles.bankTransactionBadge}>
                             <MaterialIcons name="account-balance-wallet" size={12} color="#475569" />
                             <Text style={styles.bankTransactionText}>Bank Transfer</Text>
                          </View>
                        )}
                     </View>
                  </View>

                  <View style={styles.locationsSection}>
                     <View style={styles.locationItem}>
                        <View style={styles.locationIndicator}>
                           <View style={[styles.dot, { borderColor: '#10B981' }]} />
                           <View style={styles.line} />
                        </View>
                        <View style={styles.locationInfo}>
                           <Text style={styles.locationLabel}>PICKUP</Text>
                           <Text style={styles.locationAddress}>{task?.pickup_location?.address || 'Address unavailable'}</Text>
                        </View>
                     </View>
                     <View style={styles.locationItem}>
                        <View style={styles.locationIndicator}>
                           <View style={[styles.dotFull, { backgroundColor: '#EF4444' }]} />
                        </View>
                        <View style={styles.locationInfo}>
                           <Text style={styles.locationLabel}>DROP-OFF</Text>
                           <Text style={styles.locationAddressBold}>{task?.dropoff_location?.address || 'Address unavailable'}</Text>
                        </View>
                     </View>
                  </View>

                  <View style={styles.mapButtonsRow}>
                     <TouchableOpacity 
                       style={styles.mapButton} 
                       activeOpacity={0.7}
                       onPress={() => {
                         if (task?.dropoff_location?.lat && task?.dropoff_location?.lng) {
                           openInMaps(task.dropoff_location.lat, task.dropoff_location.lng);
                         }
                       }}
                     >
                        <Ionicons name="map-outline" size={18} color="#3B82F6" />
                        <Text style={styles.mapButtonText}>OSM View</Text>
                     </TouchableOpacity>
                     <TouchableOpacity 
                       style={[styles.mapButton, { marginLeft: scale(12) }]} 
                       activeOpacity={0.7}
                       onPress={() => {
                         if (task?.dropoff_location?.lat && task?.dropoff_location?.lng) {
                           openInOSM(task.dropoff_location.lat, task.dropoff_location.lng);
                         }
                       }}
                     >
                        <Ionicons name="navigate-outline" size={18} color="#3B82F6" />
                        <Text style={styles.mapButtonText}>OSM Route</Text>
                     </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.recipientRow}>
                     <View style={styles.recipientLeft}>
                        <View style={styles.recipientAvatar}>
                           <Text style={styles.recipientAvatarText}>{(task?.recipient_name || 'R').charAt(0)}</Text>
                        </View>
                        <View style={styles.recipientInfo}>
                           <Text style={styles.recipientLabel}>RECIPIENT</Text>
                           <View style={styles.recipientNameRow}>
                              <Text style={styles.recipientName}>{task?.recipient_name || 'No Name'}</Text>
                              <View style={styles.clientBadge}>
                                 <Text style={styles.clientBadgeText}>Client</Text>
                              </View>
                           </View>
                        </View>
                     </View>
                     <View style={styles.recipientActions}>
                        <TouchableOpacity 
                          style={styles.callButton} 
                          activeOpacity={0.7}
                          onPress={() => {
                            if (task?.recipient_contact) {
                              callRecipient(task.recipient_contact);
                            }
                          }}
                        >
                           <MaterialIcons name="phone-in-talk" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                     </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.updateStatusButton} 
                    activeOpacity={0.8}
                    onPress={() => router.push(`/job/${task.request_id}`)}
                  >
                     <Text style={styles.updateStatusButtonText}>Update Job Status</Text>
                     <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
               </View>
             ))
           ) : (
             <View style={styles.emptyContainer}>
                <MaterialIcons name="assignment-turned-in" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptyText}>You haven&apos;t been assigned any tasks for today.</Text>

                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                   <Text style={styles.refreshBtnText}>Tap to refresh</Text>
                </TouchableOpacity>
             </View>
           )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.03,
        shadowRadius: moderateScale(4),
      },
      android: {
        elevation: 2,
      },
    }),
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: '#0F172A',
    padding: moderateScale(10),
    borderRadius: moderateScale(12),
  },
  appBarTitles: {
    marginLeft: scale(14),
  },
  appBarTitle: {
    fontSize: normalizeFontSize(16),
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    fontSize: normalizeFontSize(13),
    color: '#64748B',
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    backgroundColor: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: moderateScale(-4),
    right: moderateScale(-4),
    backgroundColor: '#EF4444',
    borderRadius: moderateScale(10),
    minWidth: moderateScale(18),
    height: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
  },
  profileDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfoText: {
    marginLeft: scale(8),
    marginRight: scale(4),
    justifyContent: 'center',
    maxWidth: scale(110),
  },
  profileName: {
    fontSize: normalizeFontSize(13),
    fontWeight: '700',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: normalizeFontSize(11),
    color: '#64748B',
    marginTop: verticalScale(2),
  },
  avatarContainer: {
    backgroundColor: '#0F172A',
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(100) : verticalScale(80),
    right: scale(20),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    width: scale(220),
    paddingVertical: verticalScale(8),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownHeader: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  dropdownName: {
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownEmail: {
    fontSize: normalizeFontSize(12),
    color: '#64748B',
    marginTop: verticalScale(2),
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(4),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  dropdownItemText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '500',
    color: '#475569',
    marginLeft: scale(12),
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  notifHeaderTitle: {
    fontSize: normalizeFontSize(16),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  markAllReadText: {
    fontSize: normalizeFontSize(12),
    color: '#3B82F6',
    fontWeight: '600',
  },
  emptyNotifContainer: {
    padding: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifTitle: {
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
    color: '#475569',
    marginTop: verticalScale(12),
  },
  emptyNotifSub: {
    fontSize: normalizeFontSize(13),
    color: '#94A3B8',
    marginTop: verticalScale(4),
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  notificationItemUnread: {
    backgroundColor: '#FAFAF9', // Very subtle background for unread
  },
  notifIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notifTextContainer: {
    flex: 1,
    paddingRight: scale(8),
  },
  notifMessage: {
    fontSize: normalizeFontSize(13),
    color: '#64748B',
    lineHeight: normalizeFontSize(18),
  },
  notifMessageUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  notifTime: {
    fontSize: normalizeFontSize(11),
    color: '#94A3B8',
    marginTop: verticalScale(4),
    fontWeight: '500',
  },
  notifUnreadIndicator: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#3B82F6',
    marginTop: verticalScale(6),
  },
  container: {
    flex: 1,
  },
  innerContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: verticalScale(24),
    marginTop: verticalScale(8),
  },
  headerTitle: {
    fontSize: normalizeFontSize(28),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  jobCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    alignSelf: 'flex-start',
  },
  activeDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    backgroundColor: '#10B981',
    marginRight: scale(6),
  },
  jobCountText: {
    fontSize: normalizeFontSize(13),
    color: '#059669',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    marginBottom: verticalScale(4),
  },
  circleIconButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: verticalScale(20),
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: verticalScale(12) },
        shadowOpacity: 0.08,
        shadowRadius: moderateScale(24),
      },
      android: {
        elevation: 6,
      },
    }),
  },
  urgentBadge: {
    position: 'absolute',
    top: moderateScale(-14),
    right: scale(24),
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.3,
        shadowRadius: moderateScale(8),
      },
      android: {
        elevation: 4,
      },
    }),
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(11),
    fontWeight: '700',
    marginLeft: scale(4),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(28),
  },
  timeIconContainer: {
    backgroundColor: '#F1F5F9',
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInfo: {
    marginLeft: scale(16),
    flex: 1,
  },
  label: {
    fontSize: normalizeFontSize(11),
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeRange: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: verticalScale(2),
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  onWayBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(6),
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  onWayText: {
    color: '#D97706',
    fontSize: normalizeFontSize(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bankTransactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  bankTransactionText: {
    color: '#475569',
    fontSize: normalizeFontSize(10),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  locationsSection: {
    marginBottom: verticalScale(28),
  },
  locationItem: {
    flexDirection: 'row',
  },
  locationIndicator: {
    alignItems: 'center',
    width: moderateScale(24),
  },
  dot: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    borderWidth: moderateScale(3),
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  dotFull: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    marginTop: verticalScale(4),
  },
  line: {
    width: moderateScale(2),
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(-2),
    zIndex: 1,
  },
  locationInfo: {
    flex: 1,
    marginLeft: scale(16),
    paddingBottom: verticalScale(28),
  },
  locationLabel: {
    fontSize: normalizeFontSize(11),
    color: '#64748B',
    fontWeight: '700',
    marginBottom: verticalScale(6),
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    lineHeight: normalizeFontSize(20),
    fontWeight: '500',
  },
  locationAddressBold: {
    fontSize: normalizeFontSize(14),
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: normalizeFontSize(20),
  },
  mapButtonsRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(28),
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  mapButtonText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '600',
    color: '#0369A1',
    marginLeft: scale(8),
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: verticalScale(24),
  },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(28),
  },
  recipientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientAvatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientAvatarText: {
    fontSize: normalizeFontSize(18),
    fontWeight: '700',
    color: '#475569',
  },
  recipientInfo: {
    marginLeft: scale(14),
  },
  recipientLabel: {
    fontSize: normalizeFontSize(10),
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: verticalScale(2),
  },
  recipientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientName: {
    fontSize: normalizeFontSize(16),
    fontWeight: '700',
    color: '#0F172A',
  },
  clientBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(6),
    marginLeft: scale(8),
  },
  clientBadgeText: {
    fontSize: normalizeFontSize(10),
    fontWeight: '600',
    color: '#475569',
  },
  recipientActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateStatusButton: {
    backgroundColor: '#0F172A',
    paddingVertical: verticalScale(18),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: verticalScale(6) },
        shadowOpacity: 0.2,
        shadowRadius: moderateScale(12),
      },
      android: {
        elevation: 4,
      },
    }),
  },
  updateStatusButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
    marginRight: scale(8),
  },
  emptyContainer: {
    height: verticalScale(400),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: normalizeFontSize(20),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: verticalScale(16),
  },
  emptyText: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(8),
    lineHeight: 20,
  },
  refreshBtn: {
    marginTop: verticalScale(24),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: '#F1F5F9',
  },
  refreshBtnText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: normalizeFontSize(13),
  }
});
