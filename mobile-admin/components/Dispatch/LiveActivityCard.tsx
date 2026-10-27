import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { COLORS } from '../../constants/Theme';

interface LiveActivityCardProps {
  job: {
    id: string;
    customer: string;
    location: string;
    time: string;
    status: string;
    type: string;
    priority: string;
    rider?: string;
    delivery_status?: string;
  };
}

export function LiveActivityCard({ job }: LiveActivityCardProps) {
  const router = useRouter();

  // Helper to generate deterministic plate and vehicle to make UI realistic
  const getVehicleDetails = (riderName?: string) => {
    if (!riderName) return { plate: 'N/A', model: 'No Rider Assigned' };
    
    // Deterministic generation
    let hash = 0;
    for (let i = 0; i < riderName.length; i++) {
      hash = riderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const num = Math.abs(hash % 9000) + 1000;
    const letterCode = String.fromCharCode(65 + Math.abs(hash % 26)) + String.fromCharCode(65 + Math.abs((hash >> 4) % 26));
    
    const models = ['Honda Click (Red)', 'Yamaha Mio (Black)', 'Suzuki Burgman (Grey)', 'Honda ADV (Silver)'];
    const model = models[Math.abs(hash % models.length)];
    
    return {
      plate: `${letterCode}-${num}`,
      model
    };
  };

  const getRiderInitials = (riderName?: string) => {
    if (!riderName) return '??';
    return riderName
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const vehicle = getVehicleDetails(job.rider);

  // Map sub-states to text and progress bar positioning
  const deliveryStatus = job.delivery_status || 'assigned';
  let progress = 0.2; // default: assigned
  let statusText = 'Rider Dispatched';
  let statusIcon = 'motorcycle';

  if (deliveryStatus === 'in_progress') {
    progress = 0.55;
    statusText = 'On the way to destination';
  } else if (deliveryStatus === 'arrived') {
    progress = 0.9;
    statusText = 'Arrived at drop-off point';
    statusIcon = 'check-circle';
  }

  const handlePress = () => {
    router.push({ pathname: '/job/[id]', params: { id: job.id } });
  };

  return (
    <TouchableOpacity 
      className="relative mb-5 overflow-hidden rounded-xl border p-5 shadow-lg"
      style={{
        backgroundColor: COLORS.primary,
        borderColor: '#1E293B',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
        marginBottom: verticalScale(20),
        padding: moderateScale(20),
      }}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      {/* Glow highlight */}
      <View className="absolute top-0 h-[1.5px] opacity-70" style={{ left: '10%', right: '10%', backgroundColor: COLORS.success }} />

      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between" style={{ marginBottom: verticalScale(16) }}>
        <View className="flex-row items-center">
          <FontAwesome5 name="biking" size={12} color={COLORS.success} />
          <Text className="ml-1.5 text-[10px] font-fira-bold tracking-[1px]" style={{ color: COLORS.success, marginLeft: moderateScale(6) }}>RIDER ACTIVE LIVE</Text>
        </View>
        <View className="flex-row items-center rounded-sm px-2 py-1" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: moderateScale(8), paddingVertical: verticalScale(4) }}>
          <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.success, marginRight: moderateScale(6) }} />
          <Text className="text-[9px] font-fira-bold tracking-[0.5px]" style={{ color: COLORS.success }}>LIVE TRACKING</Text>
        </View>
      </View>

      {/* Driver/Rider Info & Vehicle Info */}
      <View className="mb-4 flex-row items-center" style={{ marginBottom: verticalScale(18) }}>
        <View className="items-center justify-center rounded-full border" style={{ width: moderateScale(42), height: moderateScale(42), borderRadius: 21, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155' }}>
          <Text className="text-sm font-fira-bold" style={{ color: COLORS.onPrimary }}>{getRiderInitials(job.rider)}</Text>
        </View>
        <View className="ml-3 flex-1" style={{ marginLeft: moderateScale(12) }}>
          <Text className="text-base font-fira-bold tracking-[-0.2px]" style={{ color: COLORS.onPrimary }}>{job.rider || 'Unassigned Rider'}</Text>
          <View className="mt-1 flex-row items-center" style={{ marginTop: verticalScale(4) }}>
            <Text className="text-xs font-fira-medium" style={{ color: COLORS.muted }}>{vehicle.model}</Text>
            <View className="ml-2 rounded-md border px-1.5 py-0.5" style={{ backgroundColor: '#334155', marginLeft: moderateScale(8), paddingHorizontal: moderateScale(6), paddingVertical: verticalScale(2), borderWidth: 0.5, borderColor: '#475569' }}>
              <Text className="text-[9px] font-fira-code-bold tracking-[0.2px]" style={{ color: COLORS.surface }}>{vehicle.plate}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress Info Text */}
      <View className="mb-2.5 flex-row items-center justify-between" style={{ marginBottom: verticalScale(10) }}>
        <Text className="text-[13px] font-fira-bold" style={{ color: COLORS.onPrimary }}>{statusText}</Text>
        <Text className="font-fira-code-medium text-[11px]" style={{ color: COLORS.muted }}>JOB {job.id}</Text>
      </View>

      {/* Live Visual Progress Bar */}
      <View className="relative h-6 justify-center mb-4" style={{ height: verticalScale(24), marginBottom: verticalScale(16) }}>
        <View className="h-1 w-full rounded-sm" style={{ backgroundColor: '#1E293B' }}>
          <View className="h-full rounded-sm" style={{ width: `${progress * 100}%`, backgroundColor: COLORS.success }} />
        </View>
        {/* Node A (Pickup) */}
        <View className="absolute left-0 h-2.5 w-2.5 rounded-full border-2" style={{ backgroundColor: progress >= 0.2 ? COLORS.success : '#1E293B', borderColor: COLORS.primary }} />
        {/* Sliding Bike Marker */}
        <View className="absolute h-[22px] w-[22px] items-center justify-center rounded-full shadow-md" style={{ width: moderateScale(22), height: moderateScale(22), borderRadius: 11, left: `${progress * 100 - 4}%`, backgroundColor: COLORS.success, shadowColor: COLORS.success, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 3 }}>
          <FontAwesome5 name={statusIcon} size={13} color={COLORS.surface} />
        </View>
        {/* Node B (Dropoff) */}
        <View className="absolute right-0 h-2.5 w-2.5 rounded-full border-2" style={{ backgroundColor: progress >= 0.9 ? COLORS.success : '#1E293B', borderColor: COLORS.primary }} />
      </View>

      {/* Footer Controls */}
      <View className="mt-1 flex-row items-center justify-between border-t pt-3.5" style={{ borderTopColor: '#1E293B', paddingTop: verticalScale(14), marginTop: verticalScale(4) }}>
        <View className="mr-3 flex-1 flex-row items-center" style={{ marginRight: moderateScale(12) }}>
          <MaterialIcons name="location-on" size={14} color={COLORS.muted} />
          <Text className="ml-1.5 flex-1 text-xs font-fira-medium" style={{ color: COLORS.muted, marginLeft: moderateScale(6) }} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="mr-[2px] text-xs font-fira-bold" style={{ color: COLORS.success, marginRight: moderateScale(2) }}>Tap to Map</Text>
          <MaterialIcons name="chevron-right" size={18} color={COLORS.success} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

