import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, normalizeFontSize } from '@/utils/responsive';
import { useLocation } from '@/context/LocationContext';

interface AttendanceLockoutProps {
  status: 'absent' | 'on_leave';
  onLogout: () => void;
}

export const AttendanceLockout: React.FC<AttendanceLockoutProps> = ({ status, onLogout }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const { refreshAttendance } = useLocation();

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    setFeedbackMsg('');
    
    try {
      const nextStatus = await refreshAttendance();
      
      if (!nextStatus || nextStatus === 'present') {
        setShowWelcome(true);
      } else {
        setFeedbackMsg(`Still marked as ${nextStatus.toUpperCase()}. Contact Admin if this is an error.`);
        setTimeout(() => setFeedbackMsg(''), 5000);
      }
    } catch (error) {
      setFeedbackMsg('Failed to check status. Please try again.');
      setTimeout(() => setFeedbackMsg(''), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.restDayContainer}>
        <View style={styles.restDayIconCircle}>
          <MaterialIcons name={status === 'on_leave' ? 'flight' : 'hotel'} size={60} color="#64748B" />
        </View>
        <Text style={styles.restDayTitle}>Take it easy today!</Text>
        <Text style={styles.restDaySubtitle}>
          You are officially marked as <Text style={{ fontWeight: '900', color: '#0F172A' }}>{status.toUpperCase()}</Text> for today. 
          Functionality is restricted until your next shift.
        </Text>
        
        <View style={styles.restDayActions}>
          <TouchableOpacity 
            onPress={handleCheckStatus}
            disabled={isRefreshing}
            style={[styles.restBtn, styles.restBtnPrimary]}
          >
            {isRefreshing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="refresh" size={20} color="#FFF" />
            )}
            <Text style={styles.restBtnTextPrimary}>
              {isRefreshing ? 'Checking...' : 'Check Status'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={onLogout}
            style={[styles.restBtn, styles.restBtnSecondary]}
          >
            <MaterialIcons name="logout" size={20} color="#64748B" />
            <Text style={styles.restBtnTextSecondary}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {feedbackMsg ? (
          <Text style={styles.feedbackText}>{feedbackMsg}</Text>
        ) : null}

        <View style={styles.restDayFooter}>
          <MaterialIcons name="info-outline" size={14} color="#94A3B8" />
          <Text style={styles.restDayFooterText}>
            Need to work? Contact Admin to clear your absence.
          </Text>
        </View>
      </View>

      <Modal
        visible={showWelcome}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconCircle}>
              <MaterialIcons name="check-circle" size={80} color="#FFF" />
            </View>
            <Text style={styles.welcomeTitle}>WELCOME BACK!</Text>
            <Text style={styles.welcomeSubtitle}>
              Your attendance has been updated. You can now access your dashboard.
            </Text>
            <ActivityIndicator color="#FFF" style={{ marginTop: 20 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  restDayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    backgroundColor: '#FFFFFF',
  },
  restDayIconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  restDayTitle: {
    fontSize: normalizeFontSize(22),
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  restDaySubtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(12),
    lineHeight: 22,
    paddingHorizontal: scale(10),
  },
  restDayActions: {
    width: '100%',
    marginTop: verticalScale(40),
    gap: verticalScale(12),
  },
  restBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    borderRadius: 16,
    gap: 8,
  },
  restBtnPrimary: {
    backgroundColor: '#0F172A',
  },
  restBtnSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  restBtnTextPrimary: {
    color: '#FFF',
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  restBtnTextSecondary: {
    color: '#64748B',
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  feedbackText: {
    marginTop: verticalScale(16),
    fontSize: normalizeFontSize(12),
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '600',
  },
  restDayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: verticalScale(32),
    opacity: 0.8,
  },
  restDayFooterText: {
    fontSize: normalizeFontSize(11),
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  welcomeCard: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 32,
    padding: scale(40),
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  welcomeIconCircle: {
    marginBottom: verticalScale(24),
  },
  welcomeTitle: {
    fontSize: normalizeFontSize(32),
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  welcomeSubtitle: {
    fontSize: normalizeFontSize(16),
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: verticalScale(16),
    lineHeight: 24,
    fontWeight: '500',
  }
});
