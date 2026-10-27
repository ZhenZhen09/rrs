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
import { getPhilippineClock } from '@/utils/shiftHours';

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
    isLateCheckInApproved,
    isShiftStatusReady,
    shiftStartedAt,
    shiftHoursLocked,
    shiftSchedule,
    nextShiftStartAt,
    lastEndSource,
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
    : shiftHoursLocked
      ? 'SHIFT CLOSED'
    : hasOpenShift
      ? isOnDuty ? 'ON DUTY' : 'OFF DUTY'
      : attendanceStatus === 'present'
        ? 'OFF DUTY'
        : attendanceStatus === 'absent'
          ? 'Absent'
          : attendanceStatus === 'on_leave'
            ? 'On leave'
            : 'OFF DUTY';

  const handleToggleAvailability = async () => {
    setIsBusy(true);
    try {
      await toggleDuty(!isOnDuty);
    } finally {
      setIsBusy(false);
    }
  };

  const handleLateCheckIn = async () => {
    setIsBusy(true);
    try {
      await checkIn('present');
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

  const clock = getPhilippineClock(new Date());
  const minutesUntilEnd = shiftSchedule && clock.date === shiftSchedule.date
    ? Number(shiftSchedule.end_time.slice(0, 2)) * 60 + Number(shiftSchedule.end_time.slice(3))
      - Number(clock.time.slice(0, 2)) * 60 - Number(clock.time.slice(3))
    : null;
  const shouldShowDutyAction = isShiftStatusReady && !shiftHoursLocked && attendanceStatus !== 'absent' && attendanceStatus !== 'on_leave';
  const shouldShowLateCheckIn = isShiftStatusReady && !shiftHoursLocked && attendanceStatus === 'absent' && isLateCheckInApproved;
  const shouldShowAbsenceReport = isShiftStatusReady && !hasOpenShift && attendanceStatus === null;
  const shouldShowShiftControls = isShiftStatusReady && hasOpenShift && !shiftHoursLocked;

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
        {isShiftStatusReady && shiftHoursLocked && <View style={styles.startTimeRow}>
          <MaterialIcons name="lock-outline" size={16} color="#92400E" />
          <Text style={styles.startTimeText}>{lastEndSource === 'scheduled' ? 'Shift ended automatically. ' : 'Shift hours are closed. '}{nextShiftStartAt ? `Next start: ${nextShiftStartAt.replace(' ', ' at ')}` : 'Check back for your next shift.'}</Text>
        </View>}
        {isShiftStatusReady && !hasOpenShift && !shiftHoursLocked && lastEndSource === 'manual' && <View style={styles.startTimeRow}>
          <MaterialIcons name="check-circle-outline" size={16} color="#166534" />
          <Text style={styles.startTimeText}>Shift ended manually. You are Off Duty.</Text>
        </View>}
        {isShiftStatusReady && hasOpenShift && !shiftHoursLocked && minutesUntilEnd !== null && minutesUntilEnd > 0 && minutesUntilEnd <= 30 && <Text style={styles.startTimeText}>Your shift ends automatically in {minutesUntilEnd} minute{minutesUntilEnd === 1 ? '' : 's'}.</Text>}
        {isShiftStatusReady && attendanceStatus === 'absent' && !isLateCheckInApproved && <Text style={styles.startTimeText}>Your attendance is marked absent. Contact Admin if you need to check in late.</Text>}
        {isShiftStatusReady && shouldShowLateCheckIn && <Text style={styles.startTimeText}>Admin approved your late check-in. Checking in records attendance but does not put you On Duty.</Text>}

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

        {shouldShowLateCheckIn && (
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Check in late"
              accessibilityHint="Record your actual late check-in. This does not place you On Duty."
              disabled={isBusy}
              onPress={() => void handleLateCheckIn()}
              style={({ pressed }) => [styles.availabilityButton, styles.onDutyButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
            >
              {isBusy ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="login" size={18} color="#FFFFFF" />}
              <Text style={styles.onDutyButtonText}>{isBusy ? 'Checking in…' : 'Check in — late'}</Text>
            </Pressable>
          </View>
        )}

        {shouldShowDutyAction && (
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isOnDuty ? 'Pause availability' : 'On Duty'}
              accessibilityHint={isOnDuty ? 'Pause new delivery requests. Your shift stays open; use End shift to record your end time.' : 'Record attendance and become available for delivery requests.'}
              disabled={isBusy}
              onPress={() => void handleToggleAvailability()}
              android_ripple={{ color: 'rgba(15, 118, 110, 0.12)' }}
              style={({ pressed }) => [styles.availabilityButton, !isOnDuty && styles.onDutyButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
            >
              {isBusy ? <ActivityIndicator color={isOnDuty ? '#0F766E' : '#FFFFFF'} /> : <MaterialIcons name={isOnDuty ? 'wifi-off' : 'wifi'} size={18} color={isOnDuty ? '#0F766E' : '#FFFFFF'} />}
              <Text style={[styles.availabilityButtonText, !isOnDuty && styles.onDutyButtonText]}>{isOnDuty ? 'Pause availability' : 'On Duty'}</Text>
            </Pressable>
            {shouldShowShiftControls && <Pressable
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
            </Pressable>}
          </View>
        )}
        {shouldShowShiftControls && isOnDuty && <Text style={styles.startTimeText}>Pausing availability keeps your shift open. Use End shift to record your end time.</Text>}
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
  onDutyButton: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  onDutyButtonText: { color: '#FFFFFF' },
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
