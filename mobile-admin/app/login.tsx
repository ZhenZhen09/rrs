import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const compact = height < 700;
  const { login, isLoading, biometricEnabled, setBiometricEnabled } = useAuth();
  const { theme } = useTheme();
  const { COLORS } = theme;
  const isLight = COLORS.surface === '#FFFFFF';
  const isBlueDark = COLORS.surface === '#1E293B';
  // Screen-local presentation tokens keep the existing app themes intact.
  const palette = {
    text: isLight ? '#0F172A' : COLORS.foreground,
    secondary: isLight ? '#475569' : '#B8C3D4',
    border: isLight ? '#CBD5E1' : COLORS.border,
    field: isLight ? '#F8FAFC' : COLORS.background,
    button: isBlueDark ? COLORS.secondary : COLORS.primary,
    onButton: isBlueDark ? '#0F172A' : COLORS.onPrimary,
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!active) return;
      setIsBiometricSupported(compatible);

      if (biometricEnabled && compatible) {
        handleBiometricLogin();
      }
    })();
    return () => {
      active = false;
    };
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
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: width < 360 ? 20 : 24,
            paddingTop: compact ? 24 : 40,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[440px] self-center" style={{ flexGrow: 1 }}>
            <View className="flex-row items-center" style={{ marginBottom: compact ? 28 : 40 }}>
              <View
                className="mr-[12px] h-[44px] w-[44px] items-center justify-center rounded-[14px]"
                style={{ backgroundColor: COLORS.primary }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <MaterialIcons name="admin-panel-settings" size={24} color={COLORS.onPrimary} />
              </View>
              <View className="flex-1">
                <Text className="text-[18px] font-bold leading-[24px]" style={{ color: palette.text, includeFontPadding: false }}>Admin Control</Text>
                <Text className="mt-[2px] text-[13px] leading-[18px]" style={{ color: palette.secondary, includeFontPadding: false }}>Rider Scheduling</Text>
              </View>
            </View>

            <View style={{ marginBottom: compact ? 24 : 32 }}>
              <Text accessibilityRole="header" className="text-[30px] font-bold leading-[38px] tracking-[-0.5px]" style={{ color: palette.text, includeFontPadding: false }}>
                Welcome back
              </Text>
              <Text className="mt-[8px] text-[15px] leading-[23px]" style={{ color: palette.secondary, includeFontPadding: false }}>
                Sign in to manage your team and deliveries.
              </Text>
            </View>

            <View className="mb-[20px]">
              <Text className="mb-[8px] text-[14px] font-medium leading-[20px]" style={{ color: palette.text, includeFontPadding: false }}>Email address</Text>
              <View className="min-h-[56px] flex-row items-center rounded-[12px] border px-[16px]" style={{ backgroundColor: palette.field, borderColor: palette.border }}>
                <MaterialIcons name="alternate-email" size={20} color={palette.secondary} accessible={false} />
                <TextInput
                  className="ml-[12px] min-h-[56px] min-w-0 flex-1 py-[14px] text-[16px]"
                  style={{ color: palette.text, includeFontPadding: false, textAlignVertical: 'center' }}
                  underlineColorAndroid="transparent"
                  placeholder="admin@company.com"
                  placeholderTextColor={palette.secondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="username"
                  textContentType="username"
                  editable={!isLoading}
                  accessibilityLabel="Admin email"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View className="mb-[24px]">
              <Text className="mb-[8px] text-[14px] font-medium leading-[20px]" style={{ color: palette.text, includeFontPadding: false }}>Password</Text>
              <View className="min-h-[56px] flex-row items-center rounded-[12px] border px-[16px]" style={{ backgroundColor: palette.field, borderColor: palette.border }}>
                <MaterialIcons name="lock-outline" size={20} color={palette.secondary} accessible={false} />
                <TextInput
                  className="ml-[12px] min-h-[56px] min-w-0 flex-1 py-[14px] text-[16px]"
                  style={{ color: palette.text, includeFontPadding: false, textAlignVertical: 'center' }}
                  underlineColorAndroid="transparent"
                  placeholder="Enter your password"
                  placeholderTextColor={palette.secondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  editable={!isLoading}
                  accessibilityLabel="Password"
                />
              </View>
            </View>

            <TouchableOpacity
              className="min-h-[56px] flex-row items-center justify-center rounded-[12px] px-[16px] py-[16px]"
              style={{ backgroundColor: palette.button, opacity: isLoading ? 0.7 : 1 }}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={isLoading ? 'Signing in' : 'Sign in'}
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={palette.onButton} />
              ) : (
                <>
                  <Text className="text-[16px] font-bold leading-[24px]" style={{ color: palette.onButton, includeFontPadding: false }}>Sign in</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={palette.onButton} style={{ marginLeft: 10 }} accessible={false} />
                </>
              )}
            </TouchableOpacity>

            {isBiometricSupported && biometricEnabled && (
              <TouchableOpacity
                className="mt-[12px] min-h-[56px] flex-row items-center justify-center rounded-[12px] border px-[16px] py-[14px]"
                style={{ borderColor: palette.border, opacity: isLoading ? 0.7 : 1 }}
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with biometrics"
                accessibilityState={{ disabled: isLoading }}
              >
                <MaterialIcons name="fingerprint" size={24} color={palette.text} accessible={false} />
                <Text className="ml-[8px] shrink text-[14px] font-medium leading-[20px]" style={{ color: palette.text, includeFontPadding: false }}>Sign in with biometrics</Text>
              </TouchableOpacity>
            )}

            <View className="mt-auto flex-row items-center justify-center pt-[32px]">
              <MaterialIcons name="verified-user" size={16} color={palette.secondary} accessible={false} />
              <Text className="ml-[8px] shrink text-center text-[12px] leading-[20px]" style={{ color: palette.secondary, includeFontPadding: false }}>Administrator access only</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
