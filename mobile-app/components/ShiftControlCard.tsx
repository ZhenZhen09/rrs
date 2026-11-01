import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

const formatScheduleTime = (value: string | undefined) => {
  if (!value) return null;
  const [hourPart, minutePart] = value.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
};

const formatCountdown = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
};

const getShiftEndTimestamp = (date: string | undefined, time: string | undefined) => {
  if (!date || !time) return null;
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const timestamp = Date.parse(`${date}T${normalizedTime}+08:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
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
    canRequestShiftReopen,
    shiftReopenRequest,
    requestShiftReopen,
    toggleDuty,
  } = useLocation();
  const [isBusy, setIsBusy] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [showShiftEnd, setShowShiftEnd] = useState(false);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  const [showShiftEnded, setShowShiftEnded] = useState(false);
  const [showReopenRequest, setShowReopenRequest] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [countdownClock, setCountdownClock] = useState(Date.now());
  const reopenSubmitInFlight = useRef(false);

  const activeTaskCount = useMemo(() => tasks.filter(task => {
    const tab = getRiderTaskTab(task);
    return tab === 'today' || tab === 'overdue' || task.delivery_status === 'in_progress';
  }).length, [tasks]);

  const startTime = formatShiftStartTime(shiftStartedAt);
  const statusLabel = !isShiftStatusReady
    ? 'Checking status'
    : attendanceStatus === 'absent'
      ? 'Absent'
      : attendanceStatus === 'on_leave'
        ? 'On leave'
        : shiftHoursLocked
          ? 'SHIFT CLOSED'
          : hasOpenShift
            ? isOnDuty ? 'ON DUTY' : 'OFF DUTY'
            : 'OFF DUTY';

  const handleToggleAvailability = async () => {
    setIsBusy(true);
    try {
      const result = await toggleDuty(!isOnDuty);
      if (result === 'shift_ended') setShowShiftEnded(true);
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
  const scheduledStartTime = formatScheduleTime(shiftSchedule?.start_time);
  const scheduledEndTime = formatScheduleTime(shiftSchedule?.end_time);
  const hasScheduleForToday = shiftSchedule?.date === clock.date && Boolean(scheduledStartTime && scheduledEndTime);
  const shiftEndTimestamp = hasScheduleForToday ? getShiftEndTimestamp(shiftSchedule?.date, shiftSchedule?.end_time) : null;
  const secondsUntilShiftEnd = shiftEndTimestamp === null ? null : Math.max(0, Math.ceil((shiftEndTimestamp - countdownClock) / 1000));
  const minutesLeft = secondsUntilShiftEnd === null ? null : Math.ceil(secondsUntilShiftEnd / 60);

  useEffect(() => {
    if (!hasOpenShift || shiftEndTimestamp === null || shiftEndTimestamp <= Date.now()) return;
    setCountdownClock(Date.now());
    const interval = setInterval(() => setCountdownClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasOpenShift, shiftEndTimestamp]);
  const shouldShowDutyAction = isShiftStatusReady && !shiftHoursLocked && attendanceStatus !== 'absent' && attendanceStatus !== 'on_leave';
  const shouldShowLateCheckIn = isShiftStatusReady && !shiftHoursLocked && attendanceStatus === 'absent' && isLateCheckInApproved;
  const shouldShowAbsenceReport = isShiftStatusReady && !hasOpenShift && attendanceStatus === null;
  const shouldShowShiftControls = isShiftStatusReady && hasOpenShift && !shiftHoursLocked;
  const shouldShowReopenRequest = isShiftStatusReady && canRequestShiftReopen && attendanceStatus === 'present' && !hasOpenShift &&
    shiftReopenRequest?.status !== 'pending' && shiftReopenRequest?.status !== 'approved';

  const submitReopenRequest = async () => {
    if (reopenReason.trim().length < 5 || reopenSubmitInFlight.current) return;
    reopenSubmitInFlight.current = true;
    setIsBusy(true);
    try {
      const sent = await requestShiftReopen(reopenReason.trim());
      if (sent) {
        setReopenReason('');
        setShowReopenRequest(false);
      }
    } finally {
      reopenSubmitInFlight.current = false;
      setIsBusy(false);
    }
  };

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

        {hasOpenShift && startTime && (!hasScheduleForToday || secondsUntilShiftEnd === null) && (
          <View style={styles.startTimeRow}>
            <MaterialIcons name="schedule" size={16} color="#64748B" />
            <Text style={styles.startTimeText}>Started {startTime}</Text>
          </View>
        )}
        {isShiftStatusReady && hasOpenShift && hasScheduleForToday && secondsUntilShiftEnd !== null && (
          <View
            style={styles.shiftSummaryRow}
            accessibilityRole="summary"
            accessibilityLabel={`Started ${startTime || 'time unavailable'}. Shift ends in ${formatCountdown(secondsUntilShiftEnd)}. ${minutesLeft} minutes left.`}
          >
            <View style={styles.shiftMetric}>
              <Text style={styles.shiftMetricLabel}>STARTED</Text>
              <Text style={styles.shiftMetricValue} numberOfLines={1}>{startTime || '--'}</Text>
            </View>
            <View style={styles.shiftMetricDivider} />
            <View style={styles.shiftMetric}>
              <Text style={styles.shiftMetricLabel}>SHIFT ENDS IN</Text>
              <Text style={[styles.shiftMetricValue, styles.countdownText]} numberOfLines={1}>
                {formatCountdown(secondsUntilShiftEnd)}
              </Text>
            </View>
            <View style={styles.shiftMetricDivider} />
            <View style={styles.shiftMetric}>
              <Text style={styles.shiftMetricLabel}>MINUTES LEFT</Text>
              <Text style={styles.shiftMetricValue} numberOfLines={1}>{minutesLeft} min</Text>
            </View>
          </View>
        )}
        {isShiftStatusReady && !hasOpenShift && hasScheduleForToday && (
          <View style={styles.startTimeRow}>
            <MaterialIcons name="schedule" size={16} color="#64748B" />
            <Text style={styles.scheduleTimeText}>Scheduled today: {scheduledStartTime} to {scheduledEndTime}</Text>
          </View>
        )}
        {isShiftStatusReady && shiftHoursLocked && attendanceStatus !== 'absent' && attendanceStatus !== 'on_leave' && <View style={styles.startTimeRow}>
          <MaterialIcons name="lock-outline" size={16} color="#92400E" />
          <Text style={styles.startTimeText}>{lastEndSource === 'scheduled' ? 'Shift ended automatically. ' : 'Shift hours are closed. '}{nextShiftStartAt ? `Next start: ${nextShiftStartAt.replace(' ', ' at ')}` : 'Check back for your next shift.'}</Text>
        </View>}
        {isShiftStatusReady && attendanceStatus === 'present' && !hasOpenShift && !shiftHoursLocked && lastEndSource === 'manual' && <View style={styles.startTimeRow}>
          <MaterialIcons name="check-circle-outline" size={16} color="#166534" />
          <Text style={styles.startTimeText}>Shift ended manually. You are Off Duty.</Text>
        </View>}
        {isShiftStatusReady && attendanceStatus === 'present' && !hasOpenShift && shiftReopenRequest?.status === 'pending' && <View style={styles.reopenStatusRow}>
          <View style={styles.pendingDot} />
          <Text style={styles.reopenStatusText}>Reopen request pending admin approval.</Text>
        </View>}
        {isShiftStatusReady && attendanceStatus === 'present' && !hasOpenShift && shiftReopenRequest?.status === 'rejected' && <Text style={styles.reopenStatusText}>
          Reopen request declined{shiftReopenRequest.review_note ? `: ${shiftReopenRequest.review_note}` : '.'}
        </Text>}
        {isShiftStatusReady && attendanceStatus === 'present' && !hasOpenShift && shiftReopenRequest?.status === 'approved' && <Text style={styles.reopenApprovedText}>
          Admin approved reopening your shift. Tap On Duty to resume.
        </Text>}
        {shouldShowReopenRequest && <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request shift reopen"
          disabled={isBusy}
          onPress={() => setShowReopenRequest(true)}
          style={({ pressed }) => [styles.reopenRequestButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
        >
          <MaterialIcons name="lock-open" size={16} color="#1D4ED8" />
          <Text style={styles.reopenRequestButtonText}>{shiftReopenRequest?.status === 'rejected' ? 'Request again' : 'Request shift reopen'}</Text>
        </Pressable>}
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
      <Modal visible={showShiftEnded} transparent animationType="fade" onRequestClose={() => setShowShiftEnded(false)}>
        <View style={styles.noticeOverlay}>
          <View accessibilityViewIsModal accessibilityLabel="Shift already ended" style={styles.noticeCard}>
            <View style={styles.noticeIconWrap}>
              <MaterialIcons name="event-busy" size={26} color="#B45309" />
            </View>
            <View style={styles.noticeBadge}><Text style={styles.noticeBadgeText}>SHIFT CLOSED</Text></View>
            <Text style={styles.noticeTitle}>Shift already ended</Text>
            <Text style={styles.noticeDescription}>
              You ended this shift earlier. Ask an admin to reopen it before going On Duty again.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Request shift reopen"
              onPress={() => { setShowShiftEnded(false); setShowReopenRequest(true); }}
              style={({ pressed }) => [styles.noticePrimaryButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="lock-open" size={18} color="#FFFFFF" />
              <Text style={styles.noticePrimaryText}>Request shift reopen</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss shift ended message"
              onPress={() => setShowShiftEnded(false)}
              style={styles.noticeSecondaryButton}
            >
              <Text style={styles.noticeSecondaryText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={showReopenRequest} transparent animationType="fade" onRequestClose={() => { if (!isBusy) setShowReopenRequest(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request shift reopen</Text>
            <Text style={styles.modalDescription}>Tell an admin why you need to resume this shift. Your On Duty access stays closed until they approve.</Text>
            <TextInput
              accessibilityLabel="Reason for shift reopen"
              value={reopenReason}
              onChangeText={setReopenReason}
              editable={!isBusy}
              placeholder="Reason (at least 5 characters)"
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.reasonInput}
            />
            <View style={styles.modalActions}>
              <Pressable disabled={isBusy} onPress={() => setShowReopenRequest(false)} style={[styles.modalCancelButton, isBusy && styles.disabledButton]}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={reopenReason.trim().length < 5 || isBusy} onPress={() => void submitReopenRequest()} style={[styles.modalSubmitButton, (reopenReason.trim().length < 5 || isBusy) && styles.disabledButton]}>
                {isBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={styles.modalSubmitText}>{isBusy ? 'Sending…' : 'Send request'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  scheduleTimeText: {
    flex: 1,
    color: '#475569',
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
  },
  shiftSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
    paddingVertical: verticalScale(9),
    paddingHorizontal: scale(8),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  shiftMetric: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: scale(3) },
  shiftMetricDivider: { width: 1, height: verticalScale(30), backgroundColor: '#CBD5E1' },
  shiftMetricLabel: {
    color: '#64748B',
    fontSize: normalizeFontSize(8),
    fontWeight: '800',
    letterSpacing: 0.35,
    textAlign: 'center',
  },
  shiftMetricValue: {
    marginTop: verticalScale(3),
    color: '#0F172A',
    fontSize: normalizeFontSize(11),
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  countdownText: { color: '#0F766E', fontWeight: '900' },
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
  reopenStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: verticalScale(4) },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  reopenStatusText: { marginTop: verticalScale(4), color: '#1D4ED8', fontSize: normalizeFontSize(11), fontWeight: '700' },
  reopenApprovedText: { marginTop: verticalScale(4), color: '#047857', fontSize: normalizeFontSize(11), fontWeight: '700' },
  reopenRequestButton: { minHeight: minTouchHeight, marginTop: verticalScale(6), borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reopenRequestButtonText: { color: '#1D4ED8', fontSize: normalizeFontSize(12), fontWeight: '800' },
  noticeOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24) },
  noticeCard: { width: '100%', maxWidth: 380, alignItems: 'center', borderRadius: scale(24), backgroundColor: '#FFFFFF', paddingHorizontal: scale(24), paddingTop: verticalScale(26), paddingBottom: verticalScale(18), shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
  noticeIconWrap: { width: scale(58), height: scale(58), borderRadius: scale(20), alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7' },
  noticeBadge: { marginTop: verticalScale(16), paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFF7ED' },
  noticeBadgeText: { color: '#9A3412', fontSize: normalizeFontSize(10), fontWeight: '800', letterSpacing: 0.8 },
  noticeTitle: { marginTop: verticalScale(10), color: '#0F172A', fontSize: normalizeFontSize(20), fontWeight: '800', textAlign: 'center' },
  noticeDescription: { marginTop: verticalScale(8), color: '#64748B', fontSize: normalizeFontSize(14), lineHeight: normalizeFontSize(21), textAlign: 'center' },
  noticePrimaryButton: { width: '100%', minHeight: minTouchHeight, marginTop: verticalScale(22), borderRadius: scale(13), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1D4ED8' },
  noticePrimaryText: { color: '#FFFFFF', fontSize: normalizeFontSize(14), fontWeight: '800' },
  noticeSecondaryButton: { minHeight: 44, marginTop: verticalScale(4), paddingHorizontal: 16, justifyContent: 'center' },
  noticeSecondaryText: { color: '#64748B', fontSize: normalizeFontSize(13), fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 18 },
  modalTitle: { color: '#0F172A', fontSize: normalizeFontSize(17), fontWeight: '800' },
  modalDescription: { marginTop: 8, color: '#64748B', fontSize: normalizeFontSize(12), lineHeight: 18 },
  reasonInput: { minHeight: 96, marginTop: 14, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, color: '#0F172A', fontSize: normalizeFontSize(13) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  modalCancelButton: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, backgroundColor: '#F1F5F9' },
  modalCancelText: { color: '#475569', fontSize: normalizeFontSize(12), fontWeight: '700' },
  modalSubmitButton: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, backgroundColor: '#1D4ED8' },
  modalSubmitText: { color: '#FFFFFF', fontSize: normalizeFontSize(12), fontWeight: '800' },
  pressed: { opacity: 0.82 },
  disabledButton: { opacity: 0.6 },
});
