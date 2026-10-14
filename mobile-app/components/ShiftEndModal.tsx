import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, normalizeFontSize } from '@/utils/responsive';

interface ShiftEndModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export const ShiftEndModal: React.FC<ShiftEndModalProps> = ({ visible, onClose, onConfirm }) => {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const succeeded = await onConfirm();
      if (succeeded) onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={40} color="#10B981" />
            </View>
            <Text style={styles.title}>End Shift?</Text>
            <Text style={styles.subtitle}>
            This closes your work shift and records your end time. You can still change online availability without ending your shift.
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="stars" size={20} color="#F59E0B" />
              <Text style={styles.statText}>Shift Complete</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="visibility-off" size={20} color="#64748B" />
              <Text style={styles.statText}>Close Work Shift</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              onPress={onClose}
              disabled={loading}
              style={[styles.btn, styles.cancelBtn]}
            >
              <Text style={styles.cancelBtnText}>Keep Shift Open</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleConfirm}
              disabled={loading}
              style={[styles.btn, styles.confirmBtn]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="power-settings-new" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBtnText}>End Shift</Text>
                </>
              )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: scale(24),
    paddingBottom: verticalScale(Platform.OS === 'ios' ? 40 : 24),
  },
  header: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: normalizeFontSize(24),
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: normalizeFontSize(15),
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(8),
    lineHeight: 22,
    paddingHorizontal: scale(10),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(20),
    marginBottom: verticalScale(32),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 12,
  },
  statText: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#475569',
  },
  actions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  btn: {
    flex: 1,
    paddingVertical: verticalScale(16),
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtnText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
    color: '#64748B',
  },
  confirmBtnText: {
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
