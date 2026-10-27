import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS as DEFAULT_COLORS, RADIUS as DEFAULT_RADIUS, TYPOGRAPHY as DEFAULT_TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../../components/UI/Badge';
import { getPhilippineDateString } from '../../utils/date';

interface AttendanceRecord {
  rider_id: string;
  rider_name: string;
  rider_email: string;
  status: 'present' | 'absent' | 'on_leave' | null;
  reason: string | null;
  check_in_time: string | null;
  off_duty_time?: string | null;
  created_at: string | null;
  active_task_count: number;
}

const parsePhilippineDateTime = (value: string | null) => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`;
  const date = new Date(withOffset);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatPhilippineTime = (value: string | null) => {
  const date = parsePhilippineDateTime(value);
  if (!date) return '--:--';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const calculateDuration = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const startDate = parsePhilippineDateTime(start);
  const endDate = parsePhilippineDateTime(end);
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return '0m';
  
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.round((diffMs % 3600000) / 60000);
  
  if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
  return `${diffMins}m`;
};

function AttendanceHeroIcon({ primary, success }: { primary: string; success: string }) {
  return (
    <View className="h-24 w-24 items-center justify-center" accessible={false}>
      <View
        className="absolute h-[68px] w-[68px] rounded-[22px]"
        style={{ backgroundColor: `${primary}18`, transform: [{ rotate: '-10deg' }, { translateY: 5 }] }}
      />
      <View
        className="absolute h-[68px] w-[68px] rounded-[22px]"
        style={{ backgroundColor: `${primary}28`, transform: [{ rotate: '9deg' }, { translateY: 2 }] }}
      />
      <View
        className="h-[68px] w-[68px] items-center justify-center rounded-[22px]"
        style={{ backgroundColor: '#FFFFFF', shadowColor: primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 5 }}
      >
        <MaterialIcons name="event-available" size={36} color={primary} />
        <View className="absolute -right-2 -top-2 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: success }}>
          <MaterialIcons name="done" size={16} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

export default function AttendanceScreen() {
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY, SPACING } = theme;

  const [dateStr, setDateStr] = useState(getPhilippineDateString);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      const response = await api.get(`/users/attendance/daily?date=${dateStr}`);
      setAttendance(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const presentCount = attendance.filter((record) => record.status === 'present').length;
  const absentCount = attendance.filter((record) => record.status === 'absent').length;
  const leaveCount = attendance.filter((record) => record.status === 'on_leave').length;

  const handleClearAbsence = (record: AttendanceRecord) => {
    Alert.alert(
      "Clear Absence",
      `Are you sure you want to clear the absence for ${record.rider_name}? This allows them to start their shift again.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear Absence", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/users/attendance/${record.rider_id}`);
              Alert.alert('Success', 'Absence cleared.');
              fetchAttendance();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to clear absence');
            }
          }
        }
      ]
    );
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => {
    const shiftDuration = calculateDuration(item.check_in_time, item.off_duty_time || null);

    return (
      <View className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.primary }}>
              <Text className="text-sm font-bold" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{item.rider_name.charAt(0)}</Text>
            </View>
            <View>
              <Text className="text-base font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{item.rider_name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => item.status === 'absent' && handleClearAbsence(item)}>
            {item.status === 'absent' ? <Badge label="ABSENT" status="danger" /> :
             item.status === 'present' ? <Badge label="PRESENT" status="success" /> :
             item.status === 'on_leave' ? <Badge label="ON LEAVE" status="warning" /> :
             <Badge label="NO REPORT" status="info" />}
          </TouchableOpacity>
        </View>

        <View className="mt-3 flex-row border-t pt-3" style={{ gap: SPACING.lg, borderTopColor: COLORS.background }}>
          <View className="flex-1">
            <Text className="mb-1 text-xs" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>CHECK-IN</Text>
            <Text className="text-base" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }}>{formatPhilippineTime(item.check_in_time)}</Text>
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>CHECK-OUT</Text>
            <Text className="text-base" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }}>{formatPhilippineTime(item.off_duty_time || null)}</Text>
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>DURATION</Text>
            <Text className="text-base" style={{ color: COLORS.accentBlue, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }}>{shiftDuration || '--'}</Text>
          </View>
        </View>
        
        {item.reason && (
          <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: COLORS.background }}>
            <Text className="text-xs font-bold uppercase" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>NOTE</Text>
            <Text className="ml-2 flex-1 text-sm" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.medium }} numberOfLines={1}>{item.reason}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }} edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl tracking-[-0.5px]" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Attendance</Text>
        <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Daily Shift Auditing</Text>
      </View>
      <View className="mb-4 mt-2 flex-row items-center px-6">
        <TouchableOpacity className="rounded-xl border p-2" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
          <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{dateStr}</Text>
        <TouchableOpacity className="rounded-xl border p-2" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.rider_id}
          renderItem={renderRecord}
          ListHeaderComponent={
            <View
              className="mb-1 flex-row items-center justify-between rounded-3xl border p-5"
              style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.card, padding: SPACING.xl, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
              accessible
              accessibilityLabel={`${presentCount} present, ${absentCount} absent, ${leaveCount} on leave for ${dateStr}`}
            >
              <View className="flex-1 pr-3">
                <Text className="mb-1 text-[10px] font-bold tracking-[1.5px]" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>TODAY'S ATTENDANCE</Text>
                <Text className="text-3xl font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{presentCount}</Text>
                <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Riders present</Text>
                <View className="mt-4 flex-row items-center gap-2">
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${COLORS.danger}18` }}>
                    <Text className="text-[11px] font-bold" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{absentCount} absent</Text>
                  </View>
                  <Text className="text-[11px]" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{leaveCount} on leave</Text>
                </View>
              </View>
              <AttendanceHeroIcon primary={COLORS.primary} success={COLORS.success} />
            </View>
          }
          ListHeaderComponentStyle={{ marginBottom: SPACING.lg }}
          contentContainerStyle={{ padding: SPACING.xl, gap: SPACING.lg, paddingBottom: 100 }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="mt-[100px] items-center">
              <MaterialIcons name="event-busy" size={48} color={COLORS.muted} />
              <Text className="mt-4 text-base" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.medium }}>No attendance records</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
