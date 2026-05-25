import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import PasswordResetOverlay from '@/components/ui/PasswordResetOverlay';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const statusConfig = {
  checking: { color: '#EAB308', label: 'Checking Server' },
  ready: { color: '#22C55E', label: 'System Ready' },
  offline: { color: '#EF4444', label: 'Server Offline' },
} as const;

export default function LoginScreen() {
  const { login } = useAuth();
  
  // State
  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'offline'>('checking');

  // Animation shared value (0 = email, 1 = pin)
  const transition = useSharedValue(0);

  // Password Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetUserId, setResetUserId] = useState('');

  // PIN Translation Mapping
  const translatePinToPassword = (pin: string) => {
    const PIN_MAP: Record<string, string> = {
      '0001': 'rider1',
      '0002': 'rider2',
      '1234': 'rider1',
    };
    return PIN_MAP[pin] || pin;
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleNext = () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep('pin');
    transition.value = withSpring(1, { damping: 15, stiffness: 100 });
  };

  const handleBack = () => {
    setError('');
    setStep('email');
    transition.value = withSpring(0, { damping: 15, stiffness: 100 });
    setPassword(''); // Clear PIN when going back
  };

  const handleLogin = async () => {
    if (password.length < 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setError('');
    setLoading(true);

    const finalPassword = translatePinToPassword(password);
    const result = await login(email, finalPassword);
    
    if (result.requirePasswordReset) {
      setLoading(false);
      setResetUserId(result.userId || '');
      setResetModalVisible(true);
      return;
    }

    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Invalid PIN. Please try again.');
      setPassword(''); 
    }
  };

  const handleNumberPress = (num: string) => {
    if (password.length < 4) {
      setPassword(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  // Auto-login when 4th digit is entered
  useEffect(() => {
    if (password.length === 4 && !loading) {
      handleLogin();
    }
  }, [password]);

  useEffect(() => {
    let isMounted = true;

    const checkServerHealth = async () => {
      try {
        setServerStatus('checking');
        await api.get('/api/ping', { timeout: 45000 });
        if (isMounted) setServerStatus('ready');
      } catch {
        if (isMounted) setServerStatus('offline');
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Animated Styles
  const emailStepStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(transition.value, [0, 1], [0, -width], Extrapolate.CLAMP) }],
      opacity: interpolate(transition.value, [0, 0.5], [1, 0], Extrapolate.CLAMP),
      position: transition.value > 0.5 ? 'absolute' : 'relative',
      width: '100%',
      flex: 1,
      justifyContent: 'center',
    };
  });

  const pinStepStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(transition.value, [0, 1], [width, 0], Extrapolate.CLAMP) }],
      opacity: interpolate(transition.value, [0.5, 1], [0, 1], Extrapolate.CLAMP),
      position: transition.value < 0.5 ? 'absolute' : 'relative',
      width: '100%',
      flex: 1,
    };
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} scrollEnabled={step === 'email'}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Connection Status Indicator */}
            <View style={styles.connectionStatus}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig[serverStatus].color }]} />
              <Text style={styles.statusText}>
                {statusConfig[serverStatus].label}
              </Text>
            </View>

            {/* Logo & Header */}
            <View style={styles.headerContainer}>
              <View style={styles.logoWrapper}>
                <MaterialIcons name="directions-bike" size={moderateScale(40)} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Rider Scheduling</Text>
              <Text style={styles.subtitle}>
                {step === 'email' ? 'Identification required' : 'Security verification'}
              </Text>
            </View>

            {/* Main Animated Container */}
            <View style={styles.formContainer}>
              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.stepsWrapper}>
                {/* STEP 1: EMAIL */}
                <Animated.View style={emailStepStyle}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons name="alternate-email" size={moderateScale(20)} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput
                        testID="login_email_input"
                        style={styles.input}
                        placeholder="rider@company.com"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="next"
                        onSubmitEditing={handleNext}
                      />
                    </View>
                  </View>

                  <TouchableOpacity 
                    testID="login_continue_button"
                    style={[styles.primaryButton, !email && styles.buttonDisabled]} 
                    onPress={handleNext}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </Animated.View>

                {/* STEP 2: PIN */}
                <Animated.View style={pinStepStyle}>
                  <TouchableOpacity testID="login_back_button" style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={20} color="#64748B" />
                    <Text style={styles.backButtonText}>{email}</Text>
                  </TouchableOpacity>

                  <View style={styles.pinHeader}>
                    <Text style={styles.pinLabel}>ENTER QUICK PIN</Text>
                    <View style={styles.pinDotsRow}>
                      {[1, 2, 3, 4].map((i) => (
                        <View 
                          key={i} 
                          style={[
                            styles.pinDot, 
                            password.length >= i && styles.pinDotFilled
                          ]} 
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.numberGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <TouchableOpacity 
                        key={num} 
                        testID={`login_pin_key_${num}`}
                        style={styles.numberButton} 
                        onPress={() => handleNumberPress(num.toString())}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.numberButtonText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity testID="login_pin_clear" style={styles.numberButton} onPress={() => setPassword('')} activeOpacity={0.6}>
                      <Text style={[styles.numberButtonText, { fontSize: normalizeFontSize(14), color: '#94A3B8' }]}>CLR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="login_pin_key_0" style={styles.numberButton} onPress={() => handleNumberPress('0')} activeOpacity={0.6}>
                      <Text style={styles.numberButtonText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="login_pin_delete" style={styles.numberButton} onPress={handleDelete} activeOpacity={0.6}>
                      <MaterialIcons name="backspace" size={22} color="#475569" />
                    </TouchableOpacity>
                  </View>

                  {loading && (
                    <View style={styles.pinLoadingOverlay}>
                      <ActivityIndicator color="#0F172A" size="large" />
                      <Text style={styles.pinLoadingText}>Verifying...</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={() => Alert.alert(
                "Need Assistance?", 
                "Please contact your dispatch supervisor for PIN/Email verification support."
              )}
            >
              <Text style={styles.forgotPasswordText}>Help & Support</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      {/* Premium Password Reset Overlay */}
      <PasswordResetOverlay 
        visible={resetModalVisible}
        userId={resetUserId}
        onClose={() => setResetModalVisible(false)}
        onSuccess={() => {
          setResetModalVisible(false);
          Alert.alert('Success', 'Password updated! Please login with your new credentials.');
          handleBack();
        }}
      />
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: verticalScale(10),
    width: '100%',
    alignSelf: 'center',
  },
  statusDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginRight: scale(6),
  },
  statusText: {
    fontSize: normalizeFontSize(10),
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  logoWrapper: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(35),
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: normalizeFontSize(22),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    marginTop: verticalScale(4),
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(28),
    padding: moderateScale(24),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: verticalScale(400),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  stepsWrapper: {
    flex: 1,
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
    zIndex: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
    marginLeft: scale(8),
    flex: 1,
  },
  inputGroup: {
    marginBottom: verticalScale(24),
  },
  label: {
    fontSize: normalizeFontSize(12),
    fontWeight: '800',
    color: '#475569',
    marginBottom: verticalScale(8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(16),
    height: verticalScale(56),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: normalizeFontSize(16),
    color: '#0F172A',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(16),
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(10),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(20),
  },
  backButtonText: {
    marginLeft: scale(6),
    fontSize: normalizeFontSize(12),
    color: '#64748B',
    fontWeight: '600',
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  pinLabel: {
    fontSize: normalizeFontSize(11),
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: verticalScale(12),
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pinDot: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginHorizontal: scale(10),
  },
  pinDotFilled: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  numberButton: {
    width: '28%',
    aspectRatio: 1.3,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '2.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  numberButtonText: {
    fontSize: normalizeFontSize(22),
    fontWeight: '800',
    color: '#0F172A',
  },
  pinLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(28),
  },
  pinLoadingText: {
    marginTop: verticalScale(12),
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    color: '#0F172A',
  },
  forgotPassword: {
    marginTop: verticalScale(24),
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#94A3B8',
    fontSize: normalizeFontSize(13),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  warmingUpHint: {
    textAlign: 'center',
    color: '#EAB308',
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
    marginTop: verticalScale(12),
  },
});
