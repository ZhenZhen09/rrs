import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, RADIUS } from '../constants/Theme';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login, isLoading, biometricEnabled, setBiometricEnabled } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      
      if (biometricEnabled && compatible) {
        handleBiometricLogin();
      }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Admin Control',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (storedToken) {
           router.replace('/(tabs)');
        } else {
           Alert.alert('Notice', 'Please login with your password once to enable biometric access.');
        }
      }
    } catch (error) {
      console.error('Biometric auth failed:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      const result = await login(email, password);
      if (result.success) {
        if (isBiometricSupported && !biometricEnabled) {
          Alert.alert(
            'Enable Biometric?',
            'Would you like to use FaceID/Fingerprint for future logins?',
            [
              { text: 'No', style: 'cancel' },
              { text: 'Yes', onPress: () => setBiometricEnabled(true) }
            ]
          );
        }
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              <MaterialIcons name="admin-panel-settings" size={40} color={COLORS.onPrimary} />
            </View>
            <Text style={styles.title}>Admin Control</Text>
            <Text style={styles.subtitle}>System Management Portal</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.stepWrapper}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin Email</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="alternate-email" size={20} color={COLORS.muted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="admin@company.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.disabledButton]} 
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.onPrimary} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Login</Text>
                    <MaterialIcons name="login" size={20} color={COLORS.onPrimary} style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              {isBiometricSupported && biometricEnabled && (
                <TouchableOpacity 
                  style={styles.biometricButton} 
                  onPress={handleBiometricLogin}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <MaterialIcons name="fingerprint" size={32} color={COLORS.primary} />
                  <Text style={styles.biometricText}>Quick Login</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { 
    fontSize: TYPOGRAPHY.size['2xl'], 
    fontFamily: TYPOGRAPHY.fontFamily.bold, 
    color: COLORS.primary 
  },
  subtitle: { 
    fontSize: TYPOGRAPHY.size.sm, 
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.secondary, 
    marginTop: 4 
  },
  formContainer: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.card, padding: 24,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 400,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  stepWrapper: { width: '100%' },
  inputGroup: { marginBottom: 24 },
  label: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontFamily: TYPOGRAPHY.fontFamily.bold, 
    color: COLORS.foreground, 
    marginBottom: 8, 
    textTransform: 'uppercase' 
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 16, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.regular, color: COLORS.foreground },
  primaryButton: {
    backgroundColor: COLORS.accent, height: 56, borderRadius: RADIUS.button,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: COLORS.onPrimary, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.fontFamily.bold },
  disabledButton: { opacity: 0.7 },
  biometricButton: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  biometricText: {
    marginTop: 8,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
