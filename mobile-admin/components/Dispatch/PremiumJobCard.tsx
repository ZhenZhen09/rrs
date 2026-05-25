import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { Badge } from '../UI/Badge';
import { getStatusColor, UIGroupStatus } from '../../utils/statusMapping';

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
}

export const PremiumJobCard: React.FC<PremiumJobCardProps> = ({ job, onPress, activeTab }) => {
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(job)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.idContainer}>
          <MaterialIcons name="local-shipping" size={16} color={COLORS.accentBlue} />
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
            <FontAwesome5 name="biking" size={12} color={COLORS.accentBlue} />
            <Text style={styles.riderText} numberOfLines={1}>{job.rider}</Text>
          </View>
        ) : activeTab === 'Pending' ? (
          <View style={styles.actionPrompt}>
            <Text style={styles.actionText}>Assign Rider</Text>
            <MaterialIcons name="arrow-forward" size={14} color={COLORS.accentBlue} />
          </View>
        ) : (
          <Text style={styles.unassignedText}>Unassigned</Text>
        )}
      </View>

      {/* Side Color bar to represent job state */}
      <View style={[styles.stateBar, { backgroundColor: getStatusColor(stateGroup) }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    padding: moderateScale(16),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stateBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobId: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '800',
    color: COLORS.accentBlue,
    marginLeft: moderateScale(6),
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: verticalScale(10),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  infoText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
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
    borderTopColor: '#F1F5F9',
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  riderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 8,
    maxWidth: '60%',
  },
  riderText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentBlue,
    marginLeft: moderateScale(6),
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accentBlue,
    marginRight: moderateScale(4),
  },
  unassignedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
});
