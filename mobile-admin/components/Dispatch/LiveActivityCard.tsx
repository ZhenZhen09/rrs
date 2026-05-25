import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { moderateScale, verticalScale } from '../../utils/responsive';

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
      style={styles.cardContainer} 
      activeOpacity={0.9}
      onPress={handlePress}
    >
      {/* Glow highlight */}
      <View style={styles.topGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <FontAwesome5 name="biking" size={12} color="#10B981" />
          <Text style={styles.logoText}>RIDER ACTIVE LIVE</Text>
        </View>
        <View style={styles.liveIndicatorContainer}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>LIVE TRACKING</Text>
        </View>
      </View>

      {/* Driver/Rider Info & Vehicle Info */}
      <View style={styles.riderRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getRiderInitials(job.rider)}</Text>
        </View>
        <View style={styles.riderDetails}>
          <Text style={styles.riderName}>{job.rider || 'Unassigned Rider'}</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleModel}>{vehicle.model}</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{vehicle.plate}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress Info Text */}
      <View style={styles.statusRow}>
        <Text style={styles.statusMessage}>{statusText}</Text>
        <Text style={styles.etaText}>JOB {job.id}</Text>
      </View>

      {/* Live Visual Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        {/* Node A (Pickup) */}
        <View style={[styles.node, styles.pickupNode, progress >= 0.2 && styles.activeNode]} />
        {/* Sliding Bike Marker */}
        <View style={[styles.bikeMarker, { left: `${progress * 100 - 4}%` }]}>
          <FontAwesome5 name={statusIcon} size={13} color="#FFFFFF" />
        </View>
        {/* Node B (Dropoff) */}
        <View style={[styles.node, styles.dropoffNode, progress >= 0.9 && styles.activeNode]} />
      </View>

      {/* Footer Controls */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <MaterialIcons name="location-on" size={14} color="#94A3B8" />
          <Text style={styles.destinationText} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
        <View style={styles.actionArrow}>
          <Text style={styles.tapText}>Tap to Map</Text>
          <MaterialIcons name="chevron-right" size={18} color="#10B981" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F172A', // Slate-900
    borderRadius: 24,
    padding: moderateScale(20),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: '#1E293B', // Slate-800
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1.5,
    backgroundColor: '#10B981', // Glowing Green
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    marginLeft: moderateScale(6),
    letterSpacing: 1,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: moderateScale(6),
  },
  liveText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(18),
  },
  avatar: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: 21,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  riderDetails: {
    marginLeft: moderateScale(12),
    flex: 1,
  },
  riderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(4),
  },
  vehicleModel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  plateBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: moderateScale(6),
    paddingVertical: verticalScale(2),
    borderRadius: 6,
    marginLeft: moderateScale(8),
    borderWidth: 0.5,
    borderColor: '#475569',
  },
  plateText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  statusMessage: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  etaText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  progressContainer: {
    height: verticalScale(24),
    position: 'relative',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  node: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  pickupNode: {
    left: 0,
  },
  dropoffNode: {
    right: 0,
  },
  activeNode: {
    backgroundColor: '#10B981',
  },
  bikeMarker: {
    position: 'absolute',
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: verticalScale(14),
    marginTop: verticalScale(4),
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: moderateScale(12),
  },
  destinationText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: moderateScale(6),
    flex: 1,
  },
  actionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    marginRight: moderateScale(2),
  },
});
