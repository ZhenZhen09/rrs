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
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { useLocation } from '@/context/LocationContext';

const ABSENCE_REASONS = [
  { id: 'sick', label: 'Sick Leave', icon: 'medical-services' },
  { id: 'personal', label: 'Personal Emergency', icon: 'emergency' },
  { id: 'vehicle', label: 'Vehicle Repair', icon: 'handyman' },
  { id: 'vacation', label: 'Vacation', icon: 'flight' },
];

interface AttendanceGateProps {
  visible: boolean;
  onClose: () => void;
}

export const AttendanceGate: React.FC<AttendanceGateProps> = ({ visible, onClose }) => {
  const { attendanceStatus, isShiftStatusReady, checkIn } = useLocation();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');

  const closeReport = () => {
    setReason('');
    setSelectedReasonId('');
    onClose();
  };

  const handleReportAbsence = async () => {
    if (!selectedReasonId) return;
    setLoading(true);
    try {
      const label = ABSENCE_REASONS.find(r => r.id === selectedReasonId)?.label;
      const finalReason = reason ? `${label}: ${reason}` : label;
      if (await checkIn('absent', finalReason)) closeReport();
    } finally {
      setLoading(false);
    }
  };

  if (!isShiftStatusReady || attendanceStatus !== null) return null;

  return (
    <Modal testID="attendance-report-modal" visible={visible} animationType="slide" transparent={false} onRequestClose={closeReport}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.inner}>
            <View style={styles.header}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close absence report"
                onPress={closeReport}
                disabled={loading}
                style={styles.backButton}
              >
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.title}>Report Absence</Text>
              <Text style={styles.subtitle}>Select a reason for your absence or leave today.</Text>
            </View>

            <View style={styles.reasonGrid}>
              {ABSENCE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedReasonId === r.id }}
                  onPress={() => setSelectedReasonId(r.id)}
                  style={[
                    styles.reasonCard,
                    selectedReasonId === r.id && styles.reasonCardSelected
                  ]}
                >
                  <MaterialIcons
                    name={r.icon as any}
                    size={24}
                    color={selectedReasonId === r.id ? '#3B82F6' : '#94A3B8'}
                  />
                  <Text style={[
                    styles.reasonLabel,
                    selectedReasonId === r.id && styles.reasonLabelSelected
                  ]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Additional notes (optional)..."
              value={reason}
              onChangeText={setReason}
              multiline
              style={styles.input}
            />

            <TouchableOpacity
              onPress={handleReportAbsence}
              disabled={loading || !selectedReasonId}
              style={[
                styles.submitButton,
                (!selectedReasonId || loading) && { opacity: 0.5 }
              ]}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: scale(24),
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  title: {
    fontSize: normalizeFontSize(24),
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(8),
    paddingHorizontal: scale(20),
    lineHeight: 22,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  reasonCard: {
    width: '48%',
    padding: moderateScale(16),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    gap: 8,
  },
  reasonCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  reasonLabel: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  reasonLabelSelected: {
    color: '#3B82F6',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: moderateScale(16),
    height: verticalScale(100),
    textAlignVertical: 'top',
    fontSize: normalizeFontSize(14),
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: verticalScale(24),
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: verticalScale(18),
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: normalizeFontSize(16),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
