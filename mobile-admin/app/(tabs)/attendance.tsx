import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS as DEFAULT_COLORS, RADIUS as DEFAULT_RADIUS, TYPOGRAPHY as DEFAULT_TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../../components/UI/Badge';

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

const getPhilippineDateString = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

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

export default function AttendanceScreen() {
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY, SPACING } = theme;

  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
    title: { fontSize: TYPOGRAPHY.size['3xl'], fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary, letterSpacing: -0.5 },
    subtitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary },
    dateSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg, marginTop: SPACING.sm },
    dateBtn: { padding: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.button, borderWidth: 1, borderColor: COLORS.border },
    dateText: { flex: 1, textAlign: 'center', fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary },
    listContainer: { padding: SPACING.xl, gap: SPACING.lg, paddingBottom: 100 },
    card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.card, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    avatarContainer: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    avatarText: { color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: TYPOGRAPHY.size.sm },
    riderName: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: TYPOGRAPHY.size.base, color: COLORS.foreground },
    cardBody: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.background },
    statGroup: { flex: 1 },
    statLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.secondary, marginBottom: 4 },
    statValue: { fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.monoMedium, color: COLORS.primary },
    durationValue: { fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.monoMedium, color: COLORS.accentBlue },
    cardFooter: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reasonLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.danger, textTransform: 'uppercase' },
    reasonValue: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.danger, flex: 1, marginLeft: 8 },
    actionBtn: { padding: 6, backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.muted },
  }), [theme]);

  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.rider_name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.riderName}>{item.rider_name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => item.status === 'absent' && handleClearAbsence(item)}>
            {item.status === 'absent' ? <Badge label="ABSENT" status="danger" /> :
             item.status === 'present' ? <Badge label="PRESENT" status="success" /> :
             item.status === 'on_leave' ? <Badge label="ON LEAVE" status="warning" /> :
             <Badge label="NO REPORT" status="info" />}
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statGroup}>
            <Text style={styles.statLabel}>CHECK-IN</Text>
            <Text style={styles.statValue}>{formatPhilippineTime(item.check_in_time)}</Text>
          </View>
          <View style={styles.statGroup}>
            <Text style={styles.statLabel}>CHECK-OUT</Text>
            <Text style={styles.statValue}>{formatPhilippineTime(item.off_duty_time || null)}</Text>
          </View>
          <View style={styles.statGroup}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.durationValue}>{shiftDuration || '--'}</Text>
          </View>
        </View>
        
        {item.reason && (
          <View style={styles.cardFooter}>
            <Text style={styles.reasonLabel}>NOTE</Text>
            <Text style={styles.reasonValue} numberOfLines={1}>{item.reason}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Daily Shift Auditing</Text>
      </View>
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateBtn}>
          <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{dateStr}</Text>
        <TouchableOpacity style={styles.dateBtn}>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.rider_id}
          renderItem={renderRecord}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.muted} />
              <Text style={styles.emptyText}>No attendance records</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

