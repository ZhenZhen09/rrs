import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Modal, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import api from '../../services/api';
import { useRealTime } from '../../context/RealTimeContext';
import { getGroupedStatus, getStatusColor, UIGroupStatus } from '../../utils/statusMapping';
import { PremiumJobCard } from '../../components/Dispatch/PremiumJobCard';
import { moderateScale, verticalScale } from '../../utils/responsive';

import { useAuth } from '../../context/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CalendarScreen() {
  const router = useRouter();
  const { lastRequestUpdate, showToast } = useRealTime();
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  // Modal State
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [adminRemark, setAdminRemark] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchRiders = async () => {
    // SECURITY GUARD: Only fetch if authorized
    if (authUser?.role !== 'admin' && authUser?.role !== 'personnel') return;
    
    try {
      const response = await api.get('/users/riders');
      const allUsers = Array.isArray(response.data) ? response.data : response.data.data || [];
      setRiders(allUsers);
    } catch (error) {
      console.error('Failed to fetch riders:', error);
    }
  };

  const handleJobPress = (job: any) => {
    // Only admins can dispatch
    if (authUser?.role !== 'admin') return;

    if (job.uiGroup === 'active' || job.uiGroup === 'done' || job.uiGroup === 'failed' || job.uiGroup === 'declined') {
      router.push({ pathname: '/job/[id]', params: { id: job.id } });
    } else {
      setSelectedJob(job);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedJob || !selectedRiderId || isAssigning) return;

    setIsAssigning(true);
    try {
      await api.put(`/requests/${selectedJob.id}/approve`, {
        rider_id: selectedRiderId,
        admin_remark: adminRemark,
      });
      
      showToast(`Request #${selectedJob.id.slice(-6).toUpperCase()} assigned successfully`, 'success');
      setSelectedJob(null);
      setSelectedRiderId(null);
      setAdminRemark('');
      fetchRequests();
    } catch (error) {
      console.error('Failed to assign rider:', error);
      showToast('Failed to assign rider. Please try again.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const fetchRequests = useCallback(async () => {
    if (authLoading || !isAuthenticated || !authUser) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get('/requests?limit=100');
      setRequests(response.data.data || []);
      fetchRiders();
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [authLoading, isAuthenticated, authUser]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, lastRequestUpdate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
  const toDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dateFromParts = (year: number, month: number, day: number) => new Date(year, month, day);

  const toggleCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCalendarExpanded(prev => !prev);
  };

  const selectDate = (date: Date) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(date);
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    if (isCalendarExpanded) setIsCalendarExpanded(false);
  };

  const changeMonth = (delta: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  const getGroupsForDate = (dateString: string): UIGroupStatus[] => {
    const groups = requests
      .filter(req => req.delivery_date === dateString)
      .map(req => getGroupedStatus(req.status, req.delivery_status));
    return Array.from(new Set(groups)).slice(0, 4);
  };

  const renderHeader = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.monthTitle}>{monthNames[currentMonth.getMonth()]}</Text>
          <Text style={styles.yearTitle}>{currentMonth.getFullYear()}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => changeMonth(-1)}
            style={styles.headerButton}
          >
            <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => changeMonth(1)}
            style={styles.headerButton}
          >
            <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLegend = () => {
    const items: { label: string; group: UIGroupStatus }[] = [
      { label: 'Pending', group: 'pending' },
      { label: 'Active', group: 'active' },
      { label: 'Done', group: 'done' },
      { label: 'Failed', group: 'failed' },
      { label: 'Declined', group: 'declined' },
    ];

    return (
      <View style={styles.legendRow}>
        {items.map(item => (
          <View key={item.group} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getStatusColor(item.group) }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
      <View style={styles.daysOfWeekContainer}>
        {days.map((day, index) => (
          <Text key={index} style={styles.dayOfWeekText}>{day}</Text>
        ))}
      </View>
    );
  };

  const renderDateCell = (date: Date, key: string, isOutsideMonth = false) => {
    const dateString = toDateString(date);
    const groups = getGroupsForDate(dateString);
    const isSelected = toDateString(selectedDate) === dateString;
    const isToday = toDateString(new Date()) === dateString;

    return (
      <View key={key} style={[
        isOutsideMonth && styles.outsideMonthWrapper,
        isSelected && styles.selectedDayWrapper,
      ]}>
      <TouchableOpacity
        style={[
          styles.daySlot,
          isSelected && styles.selectedDaySlot,
          isOutsideMonth && styles.outsideMonthSlot
        ]}
        onPress={() => selectDate(date)}
      >
        <Text style={[
          styles.dayText,
          isSelected && styles.selectedDayText,
          isToday && !isSelected && styles.todayText,
          isOutsideMonth && styles.outsideMonthText
        ]}>
          {date.getDate()}
        </Text>
        {groups.length > 0 && (
          <View style={styles.eventDotsRow}>
            {groups.map((group, index) => (
              <View
                key={group}
                style={[styles.eventDot, { backgroundColor: getStatusColor(group) }]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
      </View>
    );
  };

  const renderCalendarGrid = () => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const totalDays = daysInMonth(month, year);
    const firstDay = firstDayOfMonth(month, year);

    if (!isCalendarExpanded) {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return renderDateCell(date, `week-${toDateString(date)}`, date.getMonth() !== month);
      });

      return <View style={styles.calendarGrid}>{weekDays}</View>;
    }

    const calendarDays = [];
    // Empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<View key={`empty-${i}`} style={styles.daySlot} />);
    }
    
    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      calendarDays.push(renderDateCell(dateFromParts(year, month, i), `month-${i}`));
    }

    return (
      <View style={styles.calendarGrid}>
        {calendarDays}
      </View>
    );
  };

  const renderScheduleItem = ({ item, index }: { item: any; index: number }) => (
    <View>
      <PremiumJobCard
        job={item}
        onPress={handleJobPress}
        activeTab={item.uiGroup === 'pending' ? 'Pending' : (item.uiGroup === 'active' ? 'Active' : (item.uiGroup === 'queuing' ? 'Queuing' : 'Done'))}
      />
    </View>
  );

  const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  const filteredRequests = requests.filter(req => req.delivery_date === selectedDateString);

  const mappedRequests = filteredRequests.map(req => ({
    id: req.request_id.toString(),
    customer: req.requester_name,
    location: req.dropoff_location?.address || req.dropoff_address || 'Unknown',
    time: req.time_window || 'ASAP',
    status: req.delivery_status || req.status,
    uiGroup: getGroupedStatus(req.status, req.delivery_status),
    rawStatus: req.status,
    deliveryStatus: req.delivery_status,
    riderRemark: req.rider_remark,
    assignedRiderId: req.assigned_rider_id,
    type: req.request_type || 'Delivery',
    priority: req.urgency_level,
    rider: req.assigned_rider_name,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.calendarContainer}>
        {renderHeader()}
        {renderLegend()}
        {renderDaysOfWeek()}
        {renderCalendarGrid()}
        <TouchableOpacity style={styles.calendarToggle} onPress={toggleCalendar} activeOpacity={0.8}>
          <View style={isCalendarExpanded && styles.expandedToggleIcon}>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={22}
              color={COLORS.secondary}
            />
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.scheduleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.seeAllText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading && !refreshing ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={mappedRequests}
            renderItem={renderScheduleItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.scheduleList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No schedules for this day</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Dispatch Management Modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Management</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)} disabled={isAssigning}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalJobInfo}>
                  <Text style={styles.modalJobId}>{selectedJob.id}</Text>
                  <Text style={styles.modalCustomer}>{selectedJob.customer}</Text>
                </View>

                <View style={styles.instructionSection}>
                  <Text style={styles.modalSectionTitle}>Admin Instructions</Text>
                  <View style={styles.instructionInputContainer}>
                    <TextInput
                      style={styles.instructionTextInput}
                      placeholder="Add specific instructions for the rider..."
                      placeholderTextColor={COLORS.muted}
                      multiline={true}
                      value={adminRemark}
                      onChangeText={setAdminRemark}
                    />
                  </View>
                </View>

                <View style={styles.spacer} />

                <Text style={styles.modalSectionTitle}>Select Available Rider</Text>
                {riders.length > 0 ? (
                  riders.map((rider) => (
                    <TouchableOpacity 
                      key={rider.id} 
                      style={[
                        styles.riderOption,
                        selectedRiderId === rider.id && styles.selectedRiderOption
                      ]}
                      onPress={() => setSelectedRiderId(rider.id)}
                    >
                      <FontAwesome5 
                        name="biking" 
                        size={16} 
                        color={selectedRiderId === rider.id ? COLORS.primary : COLORS.muted} 
                      />
                      <Text style={[
                        styles.riderOptionText,
                        selectedRiderId === rider.id && styles.selectedRiderOptionText
                      ]}>
                        {rider.name}
                      </Text>
                      <MaterialIcons 
                        name={selectedRiderId === rider.id ? "check-circle" : "radio-button-unchecked"} 
                        size={24} 
                        color={selectedRiderId === rider.id ? COLORS.accentBlue : COLORS.border} 
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyRiders}>
                    <Text style={styles.emptyRidersText}>No riders available</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[
                    styles.confirmDispatchButton,
                    (!selectedRiderId || isAssigning) && styles.disabledButton
                  ]}
                  onPress={handleConfirmAssignment}
                  disabled={!selectedRiderId || isAssigning}
                >
                  {isAssigning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmDispatchText}>Confirm Assignment</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryForeground,
  },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: COLORS.primaryForeground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: '900',
    color: COLORS.primary,
  },
  yearTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: COLORS.muted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayOfWeekText: {
    width: 40,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.muted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  outsideMonthWrapper: {
    opacity: 0.55,
  },
  selectedDayWrapper: {
    transform: [{ scale: 1.08 }],
  },
  daySlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 20,
  },
  outsideMonthSlot: {
    opacity: 0.45,
  },
  selectedDaySlot: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: TYPOGRAPHY.size.base - 1,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectedDayText: {
    color: COLORS.primaryForeground,
  },
  todayText: {
    color: COLORS.accentBlue,
    fontWeight: '800',
  },
  outsideMonthText: {
    color: COLORS.muted,
  },
  eventDotsRow: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarToggle: {
    alignSelf: 'center',
    width: 72,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expandedToggleIcon: {
    transform: [{ rotate: '180deg' }],
  },
  scheduleSection: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: COLORS.accentBlue,
  },
  scheduleList: {
    paddingBottom: 20,
  },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryForeground,
    borderRadius: RADIUS.button,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusIndicator: {
    width: 6,
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  scheduleStatus: {
    fontSize: TYPOGRAPHY.size.xs - 2,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    fontSize: TYPOGRAPHY.size.base - 1,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderName: {
    fontSize: TYPOGRAPHY.size.sm - 1,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '500',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    padding: moderateScale(24),
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: '900' as any, color: COLORS.primary },
  modalJobInfo: { marginBottom: verticalScale(24) },
  modalJobId: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '800' as any, color: COLORS.accentBlue, textTransform: 'uppercase' },
  modalCustomer: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: '900' as any, color: COLORS.primary, marginTop: verticalScale(4) },
  modalSectionTitle: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontWeight: '900' as any, 
    color: COLORS.secondary, 
    marginBottom: verticalScale(16), 
    textTransform: 'uppercase' 
  },
  instructionSection: {
    marginBottom: verticalScale(12),
  },
  instructionInputContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    minHeight: verticalScale(100),
    padding: moderateScale(12),
  },
  instructionTextInput: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: '600' as any,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  spacer: {
    height: verticalScale(24),
  },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: moderateScale(16),
    borderRadius: 16,
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedRiderOption: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  riderOptionText: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontWeight: '700' as any, color: COLORS.secondary, marginLeft: moderateScale(12) },
  selectedRiderOptionText: { color: COLORS.primary },
  emptyRiders: { padding: moderateScale(20), alignItems: 'center' },
  emptyRidersText: { color: COLORS.muted, fontWeight: '600' as any },
  confirmDispatchButton: {
    backgroundColor: COLORS.primary,
    padding: moderateScale(18),
    borderRadius: RADIUS.button,
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  disabledButton: {
    backgroundColor: COLORS.muted,
    opacity: 0.6,
  },
  confirmDispatchText: { color: '#FFFFFF', fontSize: TYPOGRAPHY.size.base, fontWeight: '800' as any },
});

