import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { formatDisplayDate } from '@/utils/dateUtils';
import { formatOverdueDuration } from '@/utils/eta';
import { getRiderTaskSequenceLabel } from '@/utils/taskFilters';
import { Job } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TaskDetailIcon } from './TaskDetailIcon';

type OverdueTaskCardProps = {
  task: Job;
  index: number;
  allTasks: Job[];
  isLocked: boolean;
  onPress: () => void;
};

const getDeadlineTime = (deadline?: string | null) => deadline
  ? new Date(deadline).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  : 'Not set';

export function OverdueTaskCard({ task, index, allTasks, isLocked, onPress }: OverdueTaskCardProps) {
  const buildingName = task.dropoff_location?.businessName
    || task.pickup_location?.businessName
    || 'Building not provided';
  const status = task.delivery_status || 'pending';

  return (
    <Card style={{ ...styles.card, ...(isLocked ? styles.lockedCard : {}) }}>
      <TouchableOpacity
        testID={`overdue_task_card_${index}`}
        activeOpacity={0.7}
        disabled={isLocked}
        onPress={onPress}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerDetails}>
            <View style={styles.sequenceRow}>
              <View style={styles.taskNumberBadge}>
                <Text style={styles.taskNumberText}>{getRiderTaskSequenceLabel(task, allTasks)}</Text>
              </View>
              <View style={[styles.sequenceBadge, isLocked ? styles.queuedBadge : styles.nextBadge]}>
                <Text style={[styles.sequenceBadgeText, isLocked ? styles.queuedBadgeText : styles.activeBadgeText]}>
                  {isLocked ? 'QUEUED' : 'NEXT TASK'}
                </Text>
              </View>
              {isLocked && <MaterialIcons name="lock" size={14} color="#B45309" />}
            </View>
            <View style={styles.buildingRow}>
              <MaterialIcons name="business" size={16} color="#2563EB" />
              <Text style={styles.buildingName} numberOfLines={1}>{buildingName}</Text>
            </View>
          </View>
          <Badge label={status.replace(/_/g, ' ').toUpperCase()} status={status === 'in_progress' ? 'warning' : 'info'} />
        </View>

        <View style={styles.scheduleRow}>
          <Text style={styles.dateLabel}>SCHEDULED FOR</Text>
          <Text style={styles.dateText}>{task.delivery_date ? formatDisplayDate(task.delivery_date) : 'N/A'}</Text>
          <Text style={styles.overdueDuration}>{formatOverdueDuration(task.overdue_minutes || 0)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <View style={styles.infoRow}>
            <TaskDetailIcon name="location-on" iconColor="#059669" backgroundColor="#D1FAE5" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ADDRESS</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {task.dropoff_location?.address || 'Drop-off address not provided'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <TaskDetailIcon name="person" iconColor="#7C3AED" backgroundColor="#EDE9FE" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>REQUESTER</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{task.requester_name || 'Requester not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <TaskDetailIcon name="person" iconColor="#7C3AED" backgroundColor="#EDE9FE" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>RECIPIENT</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{task.recipient_name || 'Recipient not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <TaskDetailIcon name="schedule" size={15} iconColor="#D97706" backgroundColor="#FEF3C7" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>DEADLINE</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{getDeadlineTime(task.scheduled_end_at)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.timeWindowRow}>
            <MaterialIcons name="schedule" size={14} color="#64748B" />
            <Text style={styles.timeWindow} numberOfLines={1}>{task.time_window || 'Time not set'}</Text>
          </View>
          <View style={styles.action}>
            <Text style={[styles.actionText, isLocked && styles.disabledActionText]}>
              {isLocked ? 'View Details' : 'View'}
            </Text>
            <MaterialIcons name="chevron-right" size={16} color={isLocked ? '#94A3B8' : '#3B82F6'} />
          </View>
        </View>

        {isLocked && (
          <View style={styles.lockOverlay}>
            <MaterialIcons name="lock" size={16} color="#94A3B8" />
            <Text style={styles.lockOverlayText}>FOLLOW SEQUENCE</Text>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: verticalScale(10),
    padding: moderateScale(14),
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  lockedCard: { backgroundColor: '#FAFAFA', opacity: 0.85, borderColor: '#F1F5F9', borderLeftColor: '#94A3B8' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(10) },
  headerDetails: { flex: 1, minWidth: 0, marginRight: scale(8) },
  sequenceRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), marginBottom: verticalScale(4) },
  taskNumberBadge: { backgroundColor: '#2563EB', paddingHorizontal: scale(10), paddingVertical: verticalScale(5), borderRadius: moderateScale(8) },
  taskNumberText: { fontSize: normalizeFontSize(10), fontWeight: '900', letterSpacing: 0.55, color: '#FFFFFF' },
  sequenceBadge: { paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: moderateScale(6) },
  nextBadge: { backgroundColor: '#ECFDF5' },
  queuedBadge: { backgroundColor: '#FFFBEB' },
  sequenceBadgeText: { fontSize: normalizeFontSize(8), fontWeight: '900', letterSpacing: 0.5 },
  activeBadgeText: { color: '#059669' },
  queuedBadgeText: { color: '#D97706' },
  buildingRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
  buildingName: { flex: 1, fontSize: normalizeFontSize(15), fontWeight: '900', color: '#1D4ED8' },
  scheduleRow: { flexDirection: 'row', alignItems: 'baseline', gap: scale(8), marginTop: verticalScale(2) },
  dateLabel: { fontSize: normalizeFontSize(9), fontWeight: '800', color: '#94A3B8', letterSpacing: 0.45 },
  dateText: { flex: 1, fontSize: normalizeFontSize(12), fontWeight: '700', color: '#0F172A' },
  overdueDuration: { fontSize: normalizeFontSize(11), fontWeight: '800', color: '#B91C1C' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: verticalScale(10) },
  details: { gap: verticalScale(8), marginBottom: verticalScale(10) },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoContent: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: normalizeFontSize(8), fontWeight: '900', letterSpacing: 0.55, color: '#94A3B8' },
  infoValue: { marginTop: verticalScale(1), fontSize: normalizeFontSize(12), fontWeight: '700', color: '#334155' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: verticalScale(9) },
  timeWindowRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(5), marginRight: scale(8) },
  timeWindow: { flex: 1, fontSize: normalizeFontSize(11), fontWeight: '700', color: '#475569' },
  action: { flexDirection: 'row', alignItems: 'center', gap: scale(3) },
  actionText: { fontSize: normalizeFontSize(12), fontWeight: '700', color: '#3B82F6' },
  disabledActionText: { color: '#94A3B8' },
  lockOverlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', paddingVertical: verticalScale(6), borderRadius: moderateScale(8), marginTop: verticalScale(10), borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  lockOverlayText: { marginLeft: scale(6), fontSize: normalizeFontSize(10), fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
});
