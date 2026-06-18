import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';

interface HandoverModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  taskCount: number;
}

const COMMON_HANDOVER_REASONS = [
  "Heavy Traffic / Weather",
  "Client Unreachable",
  "Vehicle Breakdown",
  "Personal Emergency",
  "Out of Time (Shift Ended)"
];

export const HandoverModal: React.FC<HandoverModalProps> = ({ visible, onClose, onConfirm, taskCount }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.alertIcon}>
                <MaterialIcons name="warning" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.title}>Incomplete Tasks</Text>
              <Text style={styles.subtitle}>
                You have {taskCount} unfinished task(s). Please provide a reason for the delay before logging off.
              </Text>
            </View>

            <View style={styles.chipContainer}>
              {COMMON_HANDOVER_REASONS.map((r, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setReason(r)}
                  style={[
                    styles.chip,
                    reason === r && styles.chipSelected
                  ]}
                >
                  <Text style={[
                    styles.chipText,
                    reason === r && styles.chipTextSelected
                  ]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Or type a specific reason here..."
              value={reason}
              onChangeText={setReason}
              multiline
              style={styles.input}
            />

            <View style={styles.actions}>
              <TouchableOpacity 
                onPress={onClose}
                disabled={loading}
                style={[styles.btn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleConfirm}
                disabled={loading || !reason.trim()}
                style={[
                  styles.btn, 
                  styles.confirmBtn,
                  (!reason.trim() || loading) && { opacity: 0.5 }
                ]}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={styles.confirmBtnText}>Confirm Log-off</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  container: {
    width: '100%',
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
    marginBottom: verticalScale(20),
  },
  alertIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: normalizeFontSize(20),
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(8),
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  chip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: normalizeFontSize(11),
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextSelected: {
    color: '#3B82F6',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: moderateScale(16),
    height: verticalScale(80),
    textAlignVertical: 'top',
    fontSize: normalizeFontSize(14),
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: verticalScale(24),
  },
  actions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  btn: {
    flex: 1,
    paddingVertical: verticalScale(16),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  confirmBtn: {
    backgroundColor: '#F43F5E',
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
