import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';

interface FallbackProps {
  error: Error;
  clearError: () => void;
}

export const BugsnagFallback: React.FC<FallbackProps> = ({ error, clearError }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="error-outline" size={moderateScale(80)} color="#EF4444" />
        </View>
        
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The application encountered an unexpected error. Our team has been notified.
        </Text>

        <View style={styles.errorCard}>
          <Text style={styles.errorLabel}>ERROR DETAILS:</Text>
          <Text style={styles.errorText} numberOfLines={3}>
            {error.message || 'Unknown error occurred'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          activeOpacity={0.8} 
          onPress={clearError}
        >
          <MaterialIcons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: scale(8) }} />
          <Text style={styles.buttonText}>Restart Application</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          If the problem persists, please contact support.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(30),
  },
  iconContainer: {
    marginBottom: verticalScale(24),
  },
  title: {
    fontSize: normalizeFontSize(24),
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  subtitle: {
    fontSize: normalizeFontSize(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: normalizeFontSize(22),
    marginBottom: verticalScale(32),
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: verticalScale(32),
  },
  errorLabel: {
    fontSize: normalizeFontSize(11),
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: verticalScale(8),
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: normalizeFontSize(13),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#475569',
  },
  button: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(24),
    borderRadius: moderateScale(12),
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(16),
    fontWeight: '700',
  },
  footerText: {
    fontSize: normalizeFontSize(12),
    color: '#94A3B8',
    marginTop: verticalScale(24),
    textAlign: 'center',
  },
});
