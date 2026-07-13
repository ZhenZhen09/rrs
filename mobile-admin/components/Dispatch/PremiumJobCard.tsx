import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { Badge } from '../UI/Badge';
import { getStatusColor, UIGroupStatus } from '../../utils/statusMapping';
import { Swipeable } from 'react-native-gesture-handler';

interface PremiumJobCardProps {
  job: {
    id: string;
    customer: string;
    location: string;
    time: string;
    status: string;
    type: string;
    priority?: string;
    rider?: string;
    uiGroup?: UIGroupStatus;
  };
  onPress: (job: any) => void;
  activeTab: string;
  onSwipeReturn?: () => void;
  onSwipeDispatch?: () => void;
  sequenceNumber?: number;
}

export const PremiumJobCard: React.FC<PremiumJobCardProps> = ({ job, onPress, activeTab, onSwipeReturn, onSwipeDispatch, sequenceNumber }) => {
  const getPriorityStatus = (priority?: string) => {
    const p = priority?.toLowerCase() || 'normal';
    if (p === 'high' || p === 'urgent') return 'danger';
    if (p === 'medium' || p === 'mid') return 'warning';
    return 'info';
  };

  const getPriorityLabel = (priority?: string) => {
    const p = priority?.toLowerCase() || 'normal';
    return p.toUpperCase();
  };

  const stateGroup = job.uiGroup || activeTab.toLowerCase() as UIGroupStatus;

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity style={styles.actionRight} onPress={onSwipeReturn}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <MaterialIcons name="assignment-return" size={28} color={COLORS.onPrimary} />
          <Text style={styles.actionText}>Return</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity style={styles.actionLeft} onPress={onSwipeDispatch}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <MaterialIcons name="local-shipping" size={28} color={COLORS.onPrimary} />
          <Text style={styles.actionText}>Dispatch</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const isPending = activeTab === 'Pending';

  return (
    <Swipeable 
      renderRightActions={isPending && onSwipeReturn ? renderRightActions : undefined}
      renderLeftActions={isPending && onSwipeDispatch ? renderLeftActions : undefined}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(job)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            {sequenceNumber !== undefined ? (
              <View style={styles.sequenceBadge}>
                <Text style={styles.sequenceBadgeText}>{sequenceNumber}</Text>
              </View>
            ) : (
              <MaterialIcons name="local-shipping" size={16} color={COLORS.primary} />
            )}
            <Text style={styles.jobId}>#{job.id?.slice(-6).toUpperCase() || job.id}</Text>
          </View>
          <Badge 
            label={getPriorityLabel(job.priority)} 
            status={getPriorityStatus(job.priority)} 
          />
        </View>

        <Text style={styles.customerName}>{job.customer || 'Unnamed Customer'}</Text>

        <View style={styles.infoRow}>
          <MaterialIcons name="place" size={16} color={COLORS.secondary} />
          <Text style={styles.infoText} numberOfLines={1}>{job.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="access-time" size={16} color={COLORS.secondary} />
          <Text style={styles.infoText}>{job.time}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{job.type}</Text>
          </View>

          {job.rider ? (
            <View style={styles.riderContainer}>
              <MaterialIcons name="two-wheeler" size={14} color={COLORS.primary} />
              <Text style={styles.riderText} numberOfLines={1}>{job.rider}</Text>
            </View>
          ) : isPending ? (
            <View style={styles.actionPrompt}>
              <Text style={styles.promptText}>Assign Rider</Text>
              <MaterialIcons name="arrow-forward" size={14} color={COLORS.accent} />
            </View>
          ) : (
            <Text style={styles.unassignedText}>Unassigned</Text>
          )}
        </View>

        {/* Side Color bar to represent job state */}
        <View style={[styles.stateBar, { backgroundColor: getStatusColor(stateGroup) }]} />
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: moderateScale(16),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  stateBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(10) },
  idContainer: { flexDirection: 'row', alignItems: 'center' },
  sequenceBadge: {
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sequenceBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
  jobId: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    color: COLORS.primary,
    marginLeft: moderateScale(6),
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.foreground,
    marginBottom: verticalScale(10),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(6) },
  infoText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: COLORS.secondary,
    marginLeft: moderateScale(8),
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  typeBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.sm,
  },
  typeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  riderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.sm,
    maxWidth: '60%',
  },
  riderText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.primary,
    marginLeft: moderateScale(6),
  },
  actionPrompt: { flexDirection: 'row', alignItems: 'center' },
  promptText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.accent,
    marginRight: moderateScale(4),
  },
  unassignedText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.muted,
  },
  actionRight: {
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    marginBottom: verticalScale(14),
    borderRadius: RADIUS.card,
    flex: 1,
  },
  actionLeft: {
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    marginBottom: verticalScale(14),
    borderRadius: RADIUS.card,
    flex: 1,
  },
  actionText: {
    color: COLORS.onPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 4,
  }
});
