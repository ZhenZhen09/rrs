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
import { useLocation } from '@/context/LocationContext';

const ABSENCE_REASONS = [
  { id: 'sick', label: 'Sick Leave', icon: 'medical-services' },
  { id: 'personal', label: 'Personal Emergency', icon: 'emergency' },
  { id: 'vehicle', label: 'Vehicle Repair', icon: 'handyman' },
  { id: 'vacation', label: 'Vacation', icon: 'flight' },
];

export const AttendanceGate: React.FC = () => {
  const { attendanceStatus, checkIn } = useLocation();
  const [view, setView] = useState<'main' | 'absent'>('main');
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');

  const handleStartShift = async () => {
    setLoading(true);
    await checkIn('present');
    setLoading(false);
  };

  const handleReportAbsence = async () => {
    if (!selectedReasonId) return;
    setLoading(true);
    const label = ABSENCE_REASONS.find(r => r.id === selectedReasonId)?.label;
    const finalReason = reason ? `${label}: ${reason}` : label;
    await checkIn('absent', finalReason);
    setLoading(false);
  };

  if (attendanceStatus !== null) return null;

  return (
    <Modal visible={true} animationType="fade" transparent={false}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {view === 'main' ? (
            <View style={styles.inner}>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="wb-sunny" size={40} color="#F59E0B" />
                </View>
                <Text style={styles.title}>Good Morning!</Text>
                <Text style={styles.subtitle}>Please check in to start your shift today.</Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  onPress={handleStartShift}
                  disabled={loading}
                  style={[styles.mainButton, styles.presentButton]}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <MaterialIcons name="check-circle" size={24} color="#FFF" />
                      <Text style={styles.buttonText}>Start Shift</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setView('absent')}
                  disabled={loading}
                  style={[styles.mainButton, styles.absentButton]}
                >
                  <MaterialIcons name="event-busy" size={24} color="#64748B" />
                  <Text style={[styles.buttonText, { color: '#64748B' }]}>I'm Absent / On Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.inner}>
              <View style={styles.header}>
                <TouchableOpacity 
                  onPress={() => setView('main')}
                  style={styles.backButton}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.title}>Report Absence</Text>
                <Text style={styles.subtitle}>Select a reason for your absence today.</Text>
              </View>

              <View style={styles.reasonGrid}>
                {ABSENCE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.id}
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
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Internal SafeAreaView import to avoid confusion
import { SafeAreaView } from 'react-native-safe-area-context';

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
    marginBottom: verticalScale(20),
  },
  iconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
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
  buttonContainer: {
    gap: verticalScale(16),
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(18),
    borderRadius: 16,
    gap: 12,
  },
  presentButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  absentButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonText: {
    fontSize: normalizeFontSize(16),
    fontWeight: '800',
    color: '#FFF',
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
