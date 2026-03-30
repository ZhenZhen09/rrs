import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetUserId, setResetUserId] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isDark = useThemeColor({ light: '', dark: '' }, 'background') === Colors.dark.background;
  const themeColors = isDark ? Colors.dark : Colors.light;

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    const result: any = await login(email, password);
    
    if (result.requirePasswordReset) {
      setLoading(false);
      setResetUserId(result.userId);
      setResetModalVisible(true); // Open the custom modal
      return;
    }

    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Invalid email or password');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword) {
      Alert.alert('Error', 'Password cannot be empty');
      return;
    }
    try {
      setResetLoading(true);
      await api.post('/api/auth/update-password', {
        userId: resetUserId,
        newPassword: newPassword
      });
      setResetLoading(false);
      setResetModalVisible(false);
      setNewPassword('');
      Alert.alert('Success', 'Password updated! Please login with your new password.');
    } catch (err: any) {
      setResetLoading(false);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo & Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              <MaterialIcons name="directions-bike" size={moderateScale(48)} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Rider Scheduling System</Text>
            <Text style={styles.subtitle}>Manage your deliveries and schedules</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={moderateScale(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={moderateScale(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={() => Alert.alert(
                "Forgot Password?", 
                "For security reasons, please contact your administrator or supervisor to reset your account credentials."
              )}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Password Reset Modal (Works on Android & iOS) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resetModalVisible}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="security" size={moderateScale(32)} color="#0F172A" />
              <Text style={styles.modalTitle}>Update Password</Text>
              <Text style={styles.modalSubtitle}>Please enter a new password to secure your account.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={moderateScale(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handlePasswordUpdate}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Set New Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton} 
              onPress={() => setResetModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(48),
  },
  logoWrapper: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(24),
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: normalizeFontSize(24),
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: verticalScale(8),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.05,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: normalizeFontSize(13),
    fontWeight: '600',
    marginLeft: scale(8),
    flex: 1,
  },
  inputGroup: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: normalizeFontSize(12),
    fontWeight: '700',
    color: '#475569',
    marginBottom: verticalScale(8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    height: verticalScale(52),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: normalizeFontSize(15),
    color: '#0F172A',
    fontWeight: '500',
    height: '100%',
  },
  loginButton: {
    backgroundColor: '#0F172A',
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(12),
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    marginTop: verticalScale(20),
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#64748B',
    fontSize: normalizeFontSize(13),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  modalTitle: {
    fontSize: normalizeFontSize(20),
    fontWeight: '800',
    color: '#0F172A',
    marginTop: verticalScale(12),
  },
  modalSubtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    textAlign: 'center',
    marginTop: verticalScale(8),
  },
  modalCancelButton: {
    marginTop: verticalScale(12),
    height: verticalScale(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: normalizeFontSize(14),
    fontWeight: '600',
  },
});
