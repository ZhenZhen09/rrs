import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Job } from '@/types';
import { useLocation } from '@/context/LocationContext';
import { getRiderTaskTab } from '@/utils/taskFilters';
import { HandoverModal } from '@/components/HandoverModal';
import { ShiftEndModal } from '@/components/ShiftEndModal';
import { AttendanceGate } from '@/components/AttendanceGate';
import { scale, verticalScale, normalizeFontSize } from '@/utils/responsive';

interface ShiftControlCardProps {
  tasks: Job[];
}

const formatShiftStartTime = (value: string | null) => {
  if (!value) return null;
  const localDateTime = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(localDateTime) ? localDateTime : `${localDateTime}+08:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit' });
};

export const ShiftControlCard: React.FC<ShiftControlCardProps> = ({ tasks }) => {
  const {
    attendanceStatus,
    checkIn,
    endShift,
    hasOpenShift,
    isOnDuty,
    isShiftStatusReady,
    shiftStartedAt,
    toggleDuty,
  } = useLocation();
  const [isBusy, setIsBusy] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [showShiftEnd, setShowShiftEnd] = useState(false);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);

  const activeTaskCount = useMemo(() => tasks.filter(task => {
    const tab = getRiderTaskTab(task);
    return tab === 'today' || tab === 'overdue' || task.delivery_status === 'in_progress';
  }).length, [tasks]);

  const startTime = formatShiftStartTime(shiftStartedAt);
  const statusLabel = !isShiftStatusReady
    ? 'Checking status'
    : hasOpenShift
      ? isOnDuty ? 'ONLINE' : 'OFFLINE'
      : attendanceStatus === 'present'
        ? 'Shift ended'
        : attendanceStatus === 'absent'
          ? 'Absent'
          : attendanceStatus === 'on_leave'
            ? 'On leave'
            : 'Not started';

  const handleStartShift = async () => {
    setIsBusy(true);
    try {
      await checkIn('present');
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleAvailability = async () => {
    setIsBusy(true);
    try {
      await toggleDuty(!isOnDuty);
    } finally {
      setIsBusy(false);
    }
  };

  const handleEndShift = async () => {
    setIsBusy(true);
    try {
      const result = await endShift();
      if (result === 'handover_required') {
        setShowShiftEnd(false);
        setShowHandover(true);
        return false;
      }
      return result === 'success';
    } finally {
      setIsBusy(false);
    }
  };

  const handleHandover = async (reason: string) => {
    setIsBusy(true);
    try {
      return (await endShift(reason)) === 'success';
    } finally {
      setIsBusy(false);
    }
  };

  const shouldShowStart = isShiftStatusReady && !hasOpenShift && (attendanceStatus === null || attendanceStatus === 'present');
  const shouldShowAbsenceReport = isShiftStatusReady && !hasOpenShift && attendanceStatus === null;
  const shouldShowShiftControls = isShiftStatusReady && hasOpenShift;

  return (
    <>
      <View testID="shift-control-card" style={styles.card}>
        <View style={styles.headingRow}>
          <View style={styles.headingIcon}>
            <MaterialIcons name="work-outline" size={18} color="#164E63" />
          </View>
          <Text style={styles.heading}>Shift today</Text>
          <View style={[styles.statusBadge, hasOpenShift && (isOnDuty ? styles.onlineBadge : styles.offlineBadge)]}>
            {hasOpenShift && <View style={[styles.statusDot, isOnDuty ? styles.onlineDot : styles.offlineDot]} />}
            <Text style={[styles.statusText, hasOpenShift && (isOnDuty ? styles.onlineText : styles.offlineText)]}>{statusLabel}</Text>
          </View>
        </View>

        {hasOpenShift && startTime && (
          <View style={styles.startTimeRow}>
            <MaterialIcons name="schedule" size={16} color="#64748B" />
            <Text style={styles.startTimeText}>Started {startTime}</Text>
          </View>
        )}

        {shouldShowStart && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={attendanceStatus === 'present' ? 'Start shift again' : 'Start shift'}
            disabled={isBusy}
            onPress={() => void handleStartShift()}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
          >
            {isBusy ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />}
            <Text style={styles.primaryButtonText}>{isBusy ? 'Starting…' : attendanceStatus === 'present' ? 'Start shift again' : 'Start shift'}</Text>
          </Pressable>
        )}

        {shouldShowAbsenceReport && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report absence or leave"
            disabled={isBusy}
            onPress={() => setShowAttendanceReport(true)}
            style={({ pressed }) => [styles.absenceButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="event-busy" size={16} color="#475569" />
            <Text style={styles.absenceButtonText}>Report absence or leave</Text>
          </Pressable>
        )}

        {shouldShowShiftControls && (
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isOnDuty ? 'Go offline' : 'Go online'}
              accessibilityHint={isOnDuty ? 'Pause availability for new delivery requests. Your shift stays open.' : 'Become available for delivery requests.'}
              disabled={isBusy}
              onPress={() => void handleToggleAvailability()}
              android_ripple={{ color: 'rgba(15, 118, 110, 0.12)' }}
              style={({ pressed }) => [styles.availabilityButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
            >
              {isBusy ? <ActivityIndicator color="#0F766E" /> : <MaterialIcons name={isOnDuty ? 'wifi-off' : 'wifi'} size={18} color="#0F766E" />}
              <Text style={styles.availabilityButtonText}>{isOnDuty ? 'Go offline' : 'Go online'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End shift"
              accessibilityHint="Close your work shift and record your end time."
              disabled={isBusy}
              onPress={() => activeTaskCount > 0 ? setShowHandover(true) : setShowShiftEnd(true)}
              android_ripple={{ color: 'rgba(180, 35, 24, 0.1)' }}
              style={({ pressed }) => [styles.endShiftButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
            >
              <MaterialIcons name="stop-circle" size={18} color="#B42318" />
              <Text style={styles.endShiftButtonText}>End shift</Text>
            </Pressable>
          </View>
        )}
      </View>

      <HandoverModal
        visible={showHandover}
        onClose={() => setShowHandover(false)}
        onConfirm={handleHandover}
        taskCount={activeTaskCount}
      />
      <ShiftEndModal
        visible={showShiftEnd}
        onClose={() => setShowShiftEnd(false)}
        onConfirm={handleEndShift}
      />
      <AttendanceGate
        visible={showAttendanceReport}
        onClose={() => setShowAttendanceReport(false)}
      />
    </>
  );
};

const minTouchHeight = Platform.select({ ios: 44, android: 48, default: 48 });

const styles = StyleSheet.create({
  card: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headingRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headingIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    color: '#0F172A',
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
  },
  statusBadge: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  onlineBadge: { backgroundColor: '#ECFDF5' },
  offlineBadge: { backgroundColor: '#F1F5F9' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  onlineDot: { backgroundColor: '#059669' },
  offlineDot: { backgroundColor: '#64748B' },
  statusText: {
    color: '#475569',
    fontSize: normalizeFontSize(11),
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  onlineText: { color: '#047857' },
  offlineText: { color: '#475569' },
  startTimeRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: verticalScale(2),
  },
  startTimeText: {
    color: '#64748B',
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: verticalScale(4),
    alignItems: 'center',
  },
  primaryButton: {
    minHeight: minTouchHeight,
    marginTop: verticalScale(4),
    paddingHorizontal: scale(14),
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(13),
    fontWeight: '800',
  },
  absenceButton: {
    minHeight: minTouchHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: verticalScale(2),
    borderRadius: scale(10),
    backgroundColor: '#F8FAFC',
  },
  absenceButtonText: {
    color: '#475569',
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
  },
  availabilityButton: {
    minHeight: minTouchHeight,
    flex: 1,
    marginVertical: verticalScale(4),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(8),
    borderRadius: scale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#99D6C9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
  },
  availabilityButtonText: {
    color: '#0F766E',
    fontSize: normalizeFontSize(11),
    fontWeight: '800',
  },
  endShiftButton: {
    minHeight: minTouchHeight,
    flex: 1,
    marginVertical: verticalScale(4),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(8),
    borderRadius: scale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF7F7',
  },
  endShiftButtonText: {
    color: '#B42318',
    fontSize: normalizeFontSize(11),
    fontWeight: '800',
  },
  pressed: { opacity: 0.82 },
  disabledButton: { opacity: 0.6 },
});
