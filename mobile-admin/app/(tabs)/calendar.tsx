import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Modal, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import api from '../../services/api';
import { useRealTimeStore } from '../../store/useRealTimeStore';
import { getGroupedStatus, getStatusColor, UIGroupStatus } from '../../utils/statusMapping';
import { PremiumJobCard } from '../../components/Dispatch/PremiumJobCard';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { useDebounce } from '../../utils/useDebounce';

import { useAuth } from '../../context/AuthContext';

const isFabricRenderer = Boolean((globalThis as typeof globalThis & {
  nativeFabricUIManager?: unknown;
}).nativeFabricUIManager);

if (Platform.OS === 'android' && !isFabricRenderer && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CalendarScreen() {
  const router = useRouter();
  const rawLastRequestUpdate = useRealTimeStore((state) => state.lastRequestUpdate);
  const lastRequestUpdate = useDebounce(rawLastRequestUpdate, 2000);
  const riderPresence = useRealTimeStore((state) => state.riderPresence);
  const showToast = useRealTimeStore((state) => state.showToast);
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
      const response = await api.get('/users/riders/live');
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
    const selectedRider = riders.find((rider) => rider.id === selectedRiderId);
    const unavailableReason = selectedRider ? getRiderUnavailableReason(selectedRider, selectedJob) : null;
    if (unavailableReason) {
      showToast(`Cannot assign rider: ${unavailableReason}`, 'warning');
      return;
    }

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
      <View className="my-5 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{monthNames[currentMonth.getMonth()]}</Text>
          <Text className="text-base" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{currentMonth.getFullYear()}</Text>
        </View>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.background }}
          >
            <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.background }}
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
      <View className="mb-3.5 flex-row flex-wrap items-center gap-2.5">
        {items.map(item => (
          <View key={item.group} className="flex-row items-center">
            <View className="mr-1 h-[7px] w-[7px] rounded-full" style={{ backgroundColor: getStatusColor(item.group) }} />
            <Text className="text-[10px] font-bold uppercase" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
      <View className="mb-2.5 flex-row justify-between">
        {days.map((day, index) => (
          <Text key={index} className="w-10 text-center text-xs font-bold" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{day}</Text>
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
      <View key={key} style={{ opacity: isOutsideMonth ? 0.55 : 1, transform: isSelected ? [{ scale: 1.08 }] : undefined }}>
      <TouchableOpacity
        className="my-1 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: isSelected ? COLORS.primary : 'transparent', opacity: isOutsideMonth ? 0.45 : 1 }}
        onPress={() => selectDate(date)}
      >
        <Text className="text-[15px]" style={{ fontFamily: isToday && !isSelected ? TYPOGRAPHY.fontFamily.bold : TYPOGRAPHY.fontFamily.medium, color: isSelected ? COLORS.primaryForeground : isToday ? COLORS.accentBlue : isOutsideMonth ? COLORS.muted : COLORS.primary }}>
          {date.getDate()}
        </Text>
        {groups.length > 0 && (
          <View className="absolute bottom-1 flex-row items-center gap-0.5">
            {groups.map((group, index) => (
              <View
                key={group}
                className="h-1 w-1 rounded-full" style={{ backgroundColor: getStatusColor(group) }}
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

      return <View className="flex-row flex-wrap justify-between">{weekDays}</View>;
    }

    const calendarDays = [];
    // Empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<View key={`empty-${i}`} className="my-1 h-10 w-10" />);
    }

    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      calendarDays.push(renderDateCell(dateFromParts(year, month, i), `month-${i}`));
    }

    return (
      <View className="flex-row flex-wrap justify-between">
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

  const normalizeDateString = (date?: string) => {
    return typeof date === 'string' ? date.split('T')[0] : '';
  };

  const getRiderUnavailableReason = (rider: any, job: any) => {
    if (!rider) return 'not found';
    if (rider.attendance_status === 'on_leave') return 'on leave';
    if (!job || normalizeDateString(job.deliveryDate) !== toDateString(new Date())) return null;
    if (rider.attendance_status === 'absent') return 'absent today';
    if (!rider.attendance_status) return 'no attendance report';
    if (!rider.is_on_duty) return 'off duty';
    const presenceStatus = riderPresence.get(rider.id);
    const isOnline = presenceStatus ? presenceStatus === 'online' : !!rider.is_online;
    if (!isOnline) return 'offline';
    return null;
  };

  const selectedRiderUnavailableReason = selectedRiderId
    ? getRiderUnavailableReason(riders.find((rider) => rider.id === selectedRiderId), selectedJob)
    : null;

  const mappedRequests = filteredRequests.map(req => ({
    id: req.request_id.toString(),
    customer: req.requester_name,
    destinationBuilding: req.dropoff_location?.businessName || req.dropoff_business_name,
    recipientName: req.recipient_name,
    personnel_instructions: req.personnel_instructions,
    admin_remark: req.admin_remark,
    location: req.dropoff_location?.address || req.dropoff_address || 'Unknown',
    time: req.time_window || 'ASAP',
    status: req.delivery_status || req.status,
    uiGroup: getGroupedStatus(req.status, req.delivery_status),
    rawStatus: req.status,
    deliveryStatus: req.delivery_status,
    deliveryDate: req.delivery_date,
    timeWindow: req.time_window,
    riderRemark: req.rider_remark,
    assignedRiderId: req.assigned_rider_id,
    type: req.request_type || 'Delivery',
    priority: req.urgency_level,
    rider: req.assigned_rider_name,
  }));

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.primaryForeground }}>
      <View className="border-b px-5 pb-2.5" style={{ backgroundColor: COLORS.primaryForeground, borderBottomColor: COLORS.border }}>
        {renderHeader()}
        {renderLegend()}
        {renderDaysOfWeek()}
        {renderCalendarGrid()}
        <TouchableOpacity className="mt-2 h-6 w-[72px] self-center items-center justify-center rounded-xl border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }} onPress={toggleCalendar} activeOpacity={0.8}>
          <View style={isCalendarExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={22}
              color={COLORS.secondary}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-5 pt-6" style={{ backgroundColor: COLORS.background }}>
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-lg font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Schedule</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text className="text-sm font-bold" style={{ color: COLORS.accentBlue, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isLoading && !refreshing ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={mappedRequests}
            renderItem={renderScheduleItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-sm" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.medium }}>No schedules for this day</Text>
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
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[85%] rounded-t-3xl p-6" style={{ backgroundColor: '#FFFFFF', padding: moderateScale(24) }}>
            <View className="mb-6 flex-row items-center justify-between" style={{ marginBottom: verticalScale(24) }}>
              <Text className="text-xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Dispatch Management</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)} disabled={isAssigning}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-6" style={{ marginBottom: verticalScale(24) }}>
                  <Text className="text-sm font-bold uppercase" style={{ color: COLORS.accentBlue, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedJob.id}</Text>
                  <Text className="mt-1 text-2xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedJob.customer}</Text>
                </View>

                <View className="mb-3" style={{ marginBottom: verticalScale(12) }}>
                  <Text className="mb-4 text-xs font-bold uppercase" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold, marginBottom: verticalScale(16) }}>Admin Instructions</Text>
                  <View className="min-h-[100px] rounded-xl border-l-4 p-3" style={{ backgroundColor: '#F1F5F9', borderLeftColor: COLORS.primary, minHeight: verticalScale(100), padding: moderateScale(12) }}>
                    <TextInput
                      className="text-sm leading-5" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium, textAlignVertical: 'top' }}
                      placeholder="Add specific instructions for the rider..."
                      placeholderTextColor={COLORS.muted}
                      multiline={true}
                      value={adminRemark}
                      onChangeText={setAdminRemark}
                    />
                  </View>
                </View>

                <View style={{ height: verticalScale(24) }} />

                <Text className="mb-4 text-xs font-bold uppercase" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold, marginBottom: verticalScale(16) }}>Select Available Rider</Text>
                {riders.length > 0 ? (
                  riders.map((rider) => {
                    const unavailableReason = getRiderUnavailableReason(rider, selectedJob);
                    const isUnavailable = !!unavailableReason;
                    const isSelected = selectedRiderId === rider.id;
                    return (
                    <TouchableOpacity
                      key={rider.id}
                      className="mb-3 flex-row items-center rounded-2xl border p-4" style={{ backgroundColor: isSelected ? '#EEF2FF' : '#F8FAFC', borderColor: isSelected ? COLORS.primary : COLORS.border, opacity: isUnavailable ? 0.55 : 1, marginBottom: verticalScale(12), padding: moderateScale(16) }}
                      onPress={() => {
                        if (isUnavailable) return;
                        setSelectedRiderId(rider.id);
                      }}
                      disabled={isUnavailable}
                    >
                      <FontAwesome5
                        name="biking"
                        size={16}
                        color={isSelected ? COLORS.primary : COLORS.muted}
                      />
                      <View className="ml-3 flex-1" style={{ marginLeft: moderateScale(12) }}>
                        <Text className="text-base font-bold" style={{ color: isUnavailable ? COLORS.muted : isSelected ? COLORS.primary : COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                          {rider.name}
                        </Text>
                        {isUnavailable && (
                          <Text className="mt-0.5 text-xs font-bold uppercase" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{unavailableReason}</Text>
                        )}
                      </View>
                      <MaterialIcons
                        name={isSelected ? "check-circle" : (isUnavailable ? "block" : "radio-button-unchecked")}
                        size={24}
                        color={isSelected ? COLORS.accentBlue : COLORS.border}
                      />
                    </TouchableOpacity>
                  );
                })
                ) : (
                  <View className="items-center p-5" style={{ padding: moderateScale(20) }}>
                    <Text style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.medium }}>No riders available</Text>
                  </View>
                )}

                <TouchableOpacity
                  className="mt-3 items-center rounded-xl p-[18px]" style={{ backgroundColor: (!selectedRiderId || isAssigning || selectedRiderUnavailableReason) ? COLORS.muted : COLORS.primary, opacity: (!selectedRiderId || isAssigning || selectedRiderUnavailableReason) ? 0.6 : 1, marginTop: verticalScale(12), padding: moderateScale(18) }}
                  onPress={handleConfirmAssignment}
                  disabled={!selectedRiderId || isAssigning || !!selectedRiderUnavailableReason}
                >
                  {isAssigning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-bold text-white" style={{ fontFamily: TYPOGRAPHY.fontFamily.bold }}>Confirm Assignment</Text>
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
