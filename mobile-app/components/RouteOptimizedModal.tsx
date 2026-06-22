import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Platform,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';

interface RouteOptimizedModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

export const RouteOptimizedModal: React.FC<RouteOptimizedModalProps> = ({ visible, onClose, message }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <View style={styles.pulseContainer}>
                <MaterialIcons name="map" size={32} color="#2563EB" />
              </View>
            </View>
            
            <Text style={styles.title}>Route Optimized</Text>
            <Text style={styles.subtitle}>
              {message || "Dispatch has updated your delivery sequence for maximum efficiency."}
            </Text>

            <View style={styles.divider} />
            
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <MaterialIcons name="bolt" size={14} color="#2563EB" />
                <Text style={styles.badgeText}>Live Sync</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#F0F9FF' }]}>
                <MaterialIcons name="trending-up" size={14} color="#0369A1" />
                <Text style={[styles.badgeText, { color: '#0369A1' }]}>Optimized</Text>
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Got it, thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  pulseContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: normalizeFontSize(20),
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: verticalScale(8),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: verticalScale(20),
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: verticalScale(20),
  },
  badgeRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(24),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: 8,
  },
  badgeText: {
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  closeButton: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: verticalScale(14),
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
