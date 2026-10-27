import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { Badge } from '../UI/Badge';
import { getStatusColor, UIGroupStatus } from '../../utils/statusMapping';
import { Swipeable } from 'react-native-gesture-handler';
import type { PresenceStatus, RiderLocation } from '../../context/RealTimeContext';
import { getDeliveryStatusPresentation } from '../../utils/deliveryStatus';

interface PremiumJobCardProps {
  job: {
    id: string;
    customer: string;
    location: string;
    time: string;
    requesterName?: string;
    onBehalfOf?: string;
    requesterDepartment?: string;
    deliveryDate?: string;
    timeWindow?: string;
    pickupAddress?: string;
    pickupContactName?: string;
    destinationAddress?: string;
    recipientName?: string;
    destinationBuilding?: string;
    recipientContact?: string;
    personnel_instructions?: string;
    admin_remark?: string;
    status: string;
    type: string;
    priority?: string;
    rider?: string;
    delivery_status?: string;
    uiGroup?: UIGroupStatus;
    is_overdue?: boolean;
    overdue_label?: string;
    recommended_action?: string | null;
  };
  onPress: (job: any) => void;
  activeTab: string;
  onSwipeReturn?: () => void;
  onSwipeDispatch?: () => void;
  sequenceNumber?: number;
  riderPresence?: PresenceStatus;
  riderLocation?: RiderLocation;
}

export const PremiumJobCard: React.FC<PremiumJobCardProps> = ({ job, onPress, activeTab, onSwipeReturn, onSwipeDispatch, sequenceNumber, riderPresence, riderLocation }) => {
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

  const formatDeliveryDate = (value?: string) => {
    if (!value) return '';

    // Parse YYYY-MM-DD as a local calendar date so it doesn't shift by timezone.
    const dateOnly = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(value);

    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const stateGroup = job.uiGroup || activeTab.toLowerCase() as UIGroupStatus;
  const displayId = activeTab === 'Pending'
    ? (job.id?.replace(/^req_/, '') || job.id)
    : (job.id?.slice(-6).toUpperCase() || job.id);
  const requesterName = job.onBehalfOf || job.requesterName || job.customer || 'Unnamed Customer';
  const accountName = job.onBehalfOf && job.requesterName && job.onBehalfOf !== job.requesterName
    ? job.requesterName
    : undefined;
  const schedule = [formatDeliveryDate(job.deliveryDate), job.timeWindow || job.time]
    .filter(Boolean)
    .join(' \u2022 ');
  const deliveryStatus = getDeliveryStatusPresentation(job.delivery_status);
  const isLive = activeTab === 'Active' && job.delivery_status === 'in_progress';
  const riderStatus = riderPresence === 'online' ? 'Rider online' : riderPresence === 'offline' ? 'Rider offline' : 'Status unavailable';
  const lastUpdated = riderLocation?.lastUpdate
    ? new Date(riderLocation.lastUpdate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity className="flex-1 items-end justify-center rounded-xl pr-5" style={styles.actionRight} onPress={onSwipeReturn}>
        <Animated.View className="items-center" style={{ transform: [{ scale }] }}>
          <MaterialIcons name="assignment-return" size={28} color={COLORS.onPrimary} />
          <Text className="mt-1 font-fira-bold text-xs" style={styles.actionText}>Return</Text>
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
      <TouchableOpacity className="flex-1 items-start justify-center rounded-xl pl-5" style={styles.actionLeft} onPress={onSwipeDispatch}>
        <Animated.View className="items-center" style={{ transform: [{ scale }] }}>
          <MaterialIcons name="local-shipping" size={28} color={COLORS.onPrimary} />
          <Text className="mt-1 font-fira-bold text-xs" style={styles.actionText}>Dispatch</Text>
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
        className="relative overflow-hidden border p-4 shadow-sm"
        style={[styles.cardTheme, activeTab === 'Active' && { padding: moderateScale(12), marginBottom: verticalScale(10) }]}
        onPress={() => onPress(job)}
        activeOpacity={0.85}
      >
        <View className="mb-2.5 flex-row items-center justify-between" style={{ marginBottom: verticalScale(10) }}>
          <View className="flex-row items-center">
            {sequenceNumber !== undefined ? (
              <View className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.primary }}>
              <Text className="font-fira-bold text-[10px] text-white">{sequenceNumber}</Text>
              </View>
            ) : (
              <MaterialIcons name="local-shipping" size={16} color={COLORS.primary} />
            )}
            <Text className="ml-1.5 font-fira-code-medium text-xs tracking-[0.5px]" style={{ color: COLORS.primary, marginLeft: moderateScale(6) }} numberOfLines={1}>#{displayId?.toUpperCase()}</Text>
          </View>
          <Badge 
            label={getPriorityLabel(job.priority)} 
            status={getPriorityStatus(job.priority)} 
          />
        </View>

        {isPending ? (
          <>
            <View className="mb-2.5 flex-row items-center rounded-[4px] px-2.5 py-2" style={[styles.scheduleRowTheme, { paddingHorizontal: moderateScale(10), paddingVertical: verticalScale(8), marginBottom: verticalScale(10) }]}>
              <MaterialIcons name="access-time" size={16} color={COLORS.secondary} />
              <Text className="flex-1 font-fira-bold text-xs" style={[styles.scheduleTextTheme, { marginLeft: moderateScale(8) }]}>{schedule || 'Schedule pending'}</Text>
            </View>

            <View className="mb-2.5 rounded-lg p-3" style={[styles.requesterPanelTheme, { padding: moderateScale(12), marginBottom: verticalScale(10) }]}>
              <Text className="mb-[3px] font-fira-bold text-[10px] uppercase" style={[styles.sectionLabelTheme, { marginBottom: verticalScale(3) }]}>Requester Name</Text>
              <Text className="mb-2.5 font-fira-bold text-base" style={[styles.customerNameTheme, { marginBottom: verticalScale(10) }]}>{requesterName}</Text>
              {accountName ? (
                <Text className="mt-0.5 font-fira-medium text-[11px]" style={[styles.accountNameTheme, { marginTop: verticalScale(2) }]}>Account: {accountName}</Text>
              ) : null}
              {job.requesterDepartment ? (
                <Text className="mt-1 font-fira-bold text-[10px] uppercase" style={[styles.departmentTextTheme, { marginTop: verticalScale(4) }]}>{job.requesterDepartment}</Text>
              ) : null}
            </View>

            <View className="rounded-lg border p-3" style={[styles.locationsPanelTheme, { padding: moderateScale(12) }]}>
              <View className="flex-row items-start">
                <MaterialIcons name="place" size={16} color={COLORS.success} />
                <View className="ml-2 flex-1">
                  <Text className="mb-[3px] font-fira-bold text-[10px] uppercase" style={[styles.sectionLabelTheme, { marginBottom: verticalScale(3) }]}>Origin</Text>
                  <Text className="font-fira-medium text-xs leading-[18px]" style={styles.locationDetailTextTheme}>{job.pickupAddress || 'Unknown'}</Text>
                  {job.pickupContactName ? (
                    <Text className="mt-[3px] font-fira-bold text-[10px]" style={{ color: COLORS.success, marginTop: verticalScale(3) }}>Contact: {job.pickupContactName}</Text>
                  ) : null}
                </View>
              </View>
              <View className="my-2.5 h-px" style={[styles.locationDividerTheme, { marginVertical: verticalScale(10) }]} />
              <View className="flex-row items-start">
                <MaterialIcons name="place" size={16} color={COLORS.danger} />
                <View className="ml-2 flex-1">
                  <Text className="mb-[3px] font-fira-bold text-[10px] uppercase" style={[styles.sectionLabelTheme, { marginBottom: verticalScale(3) }]}>Destination</Text>
                  <Text className="font-fira-medium text-xs leading-[18px]" style={styles.locationDetailTextTheme}>{job.destinationAddress || job.location || 'Unknown'}</Text>
                  {job.recipientName ? (
                    <Text className="mt-[3px] font-fira-bold text-[10px]" style={{ color: COLORS.danger, marginTop: verticalScale(3) }}>Recipient: {job.recipientName}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {activeTab === 'Active' || activeTab === 'Overdue' ? (
              <View className="mb-2.5 flex-row items-center rounded-[4px] border px-2.5 py-2" style={[styles.liveStatusRow, { borderColor: isLive ? COLORS.success : COLORS.border, marginBottom: verticalScale(10), paddingHorizontal: moderateScale(10), paddingVertical: verticalScale(8) }]}>
                <MaterialIcons name={isLive ? 'my-location' : 'schedule'} size={16} color={isLive ? COLORS.success : COLORS.secondary} />
                <View className="ml-2 flex-1" style={{ marginLeft: moderateScale(8) }}>
                  <View className="flex-row items-center">
                    {isLive ? <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.success, marginRight: moderateScale(6) }} /> : null}
                    <Text className="font-fira-bold text-xs" style={{ color: activeTab === 'Overdue' ? COLORS.danger : isLive ? COLORS.success : COLORS.primary }}>{activeTab === 'Overdue' ? 'OVERDUE' : deliveryStatus.label}</Text>
                    <Text className="ml-2 font-fira-medium text-[10px]" style={{ color: COLORS.secondary, marginLeft: moderateScale(8) }}>{deliveryStatus.detail}</Text>
                  </View>
                  {activeTab === 'Overdue' ? <Text className="mt-0.5 font-fira-bold text-[10px]" style={{ color: COLORS.danger, marginTop: verticalScale(2) }}>{job.overdue_label || 'Needs attention'} • {(job.recommended_action || 'contact rider').replace('_', ' ')}</Text> : null}
                  {isLive ? <Text className="mt-0.5 font-fira-medium text-[10px]" style={{ color: COLORS.secondary, marginTop: verticalScale(2) }}>{riderStatus}{lastUpdated ? ` \u2022 Updated ${lastUpdated}` : ''}</Text> : null}
                </View>
              </View>
            ) : null}
            <Text className="mb-2.5 font-fira-bold text-base" style={[styles.customerNameTheme, { marginBottom: verticalScale(10) }]}>{job.customer || 'Unnamed Customer'}</Text>
            <View className="mb-1.5 flex-row items-center" style={{ marginBottom: verticalScale(6) }}>
              <MaterialIcons name="place" size={16} color={COLORS.secondary} />
              <Text className="ml-2 flex-1 font-fira-medium text-xs" style={[styles.infoTextTheme, { marginLeft: moderateScale(8) }]} numberOfLines={activeTab === 'Active' ? undefined : 1}>{job.location}</Text>
            </View>
            <View className="mb-1.5 flex-row items-center" style={{ marginBottom: verticalScale(6) }}>
              <MaterialIcons name="access-time" size={16} color={COLORS.secondary} />
              <Text className="ml-2 flex-1 font-fira-medium text-xs" style={[styles.infoTextTheme, { marginLeft: moderateScale(8) }]}>{job.time}</Text>
            </View>
          </>
        )}

        {activeTab === 'Active' ? (
          <View className="mt-2 gap-1.5 border-t pt-2" style={{ borderTopColor: COLORS.border }}>
            {[
              ['Drop-Off Destination Building', job.destinationBuilding],
              ['Preferred Date', formatDeliveryDate(job.deliveryDate)],
              ['Recipient Name', job.recipientName],
              ['Personnel Note', job.personnel_instructions],
              ['Admin Note', job.admin_remark],
            ].map(([label, value]) => (
              <Text key={label} className="font-fira-medium text-[14px] leading-[20px]" style={styles.customerNameTheme}>
                <Text className="font-fira-bold">{label}: </Text>
                {value?.trim() || 'Not provided'}
              </Text>
            ))}
          </View>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={[styles.cardFooterTheme, activeTab === 'Active' && { marginTop: verticalScale(8), paddingTop: verticalScale(8) }]}>
          <View className="rounded-[4px] px-2 py-1" style={[styles.typeBadgeTheme, { paddingHorizontal: moderateScale(8), paddingVertical: verticalScale(4) }]}>
            <Text className="font-fira-bold text-[10px] uppercase" style={styles.typeTextTheme}>{job.type}</Text>
          </View>

          {job.rider ? (
            <View className="max-w-3/5 flex-row items-center rounded-[4px] px-2 py-1" style={[styles.riderContainerTheme, { paddingHorizontal: moderateScale(8), paddingVertical: verticalScale(4) }]}>
              <MaterialIcons name="two-wheeler" size={14} color={COLORS.primary} />
              <Text className="ml-1.5 shrink font-fira-bold text-[10px]" style={[styles.riderTextTheme, { marginLeft: moderateScale(6) }]} numberOfLines={activeTab === 'Active' ? undefined : 1}>{job.rider}</Text>
            </View>
          ) : isPending ? (
            <View className="flex-row items-center">
              <Text className="mr-1 font-fira-bold text-[11px]" style={[styles.promptTextTheme, { marginRight: moderateScale(4) }]}>Assign Rider</Text>
              <MaterialIcons name="arrow-forward" size={14} color={COLORS.accent} />
            </View>
          ) : (
            <Text className="font-fira-bold text-[10px]" style={styles.unassignedTextTheme}>Unassigned</Text>
          )}
        </View>

        {/* Side Color bar to represent job state */}
        <View className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: getStatusColor(stateGroup) }} />
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  cardTheme: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: moderateScale(16),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  customerNameTheme: { color: COLORS.foreground },
  scheduleRowTheme: { backgroundColor: COLORS.background },
  liveStatusRow: { backgroundColor: COLORS.background },
  scheduleTextTheme: { color: COLORS.primary },
  requesterPanelTheme: { backgroundColor: COLORS.background },
  sectionLabelTheme: { color: COLORS.secondary },
  accountNameTheme: { color: COLORS.secondary },
  departmentTextTheme: { color: COLORS.primary },
  locationsPanelTheme: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  locationDetailTextTheme: { color: COLORS.primary, lineHeight: verticalScale(18) },
  locationDividerTheme: { backgroundColor: COLORS.border },
  infoTextTheme: { color: COLORS.secondary },
  cardFooterTheme: { borderTopColor: COLORS.background, marginTop: verticalScale(12), paddingTop: verticalScale(12), borderTopWidth: 1 },
  typeBadgeTheme: { backgroundColor: COLORS.background },
  typeTextTheme: { color: COLORS.secondary },
  riderContainerTheme: { backgroundColor: COLORS.background },
  riderTextTheme: { color: COLORS.primary },
  promptTextTheme: { color: COLORS.accent },
  unassignedTextTheme: { color: COLORS.muted },
  actionRight: {
    backgroundColor: COLORS.warning,
    marginBottom: verticalScale(14),
  },
  actionLeft: {
    backgroundColor: COLORS.success,
    marginBottom: verticalScale(14),
  },
  actionText: { color: COLORS.onPrimary },
});
