import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Keyboard, ActivityIndicator, Alert, ScrollView, Image, StatusBar, useWindowDimensions, findNodeHandle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import PasswordResetOverlay from '@/components/ui/PasswordResetOverlay';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedKeyboard,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate,
  ReduceMotion,
} from 'react-native-reanimated';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { useConnection } from '@/context/ConnectionContext';

const loginHero = require('../assets/images/login-hero-rider.png');
const loginRoadFooter = require('../assets/images/login-road-footer.png');
const errandsWordmark = require('../assets/images/errands-rider-wordmark.png');
const loginSurfaceColor = '#F8FAFC';

const statusConfig = {
  checking: { color: '#EAB308', label: 'Checking connection' },
  ready: { color: '#22C55E', label: 'System Ready' },
  no_network: { color: '#EF4444', label: 'No Internet Connection' },
  service_unavailable: { color: '#EF4444', label: 'Cannot reach Errands' },
} as const;

export default function LoginScreen() {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  const keyboard = useAnimatedKeyboard();
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);
  const compactLayout = height < 720;
  const heroHeight = compactLayout
    ? Math.min(verticalScale(230), height * 0.3)
    : Math.min(verticalScale(350), height * 0.43);
  const heroImageWidth = heroHeight * (2048 / 684);
  
  // State
  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { state: connectionState, retry: retryConnection } = useConnection();
  const serverStatus = connectionState === 'online' ? 'ready' : connectionState;
  const reduceMotion = useReducedMotionPreference();
  const submitInProgress = useRef(false);
  const [pinFocused, setPinFocused] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const pinFeedback = useSharedValue(0);
  const authSucceeded = useRef(false);

  // Animation shared value (0 = email, 1 = pin)
  const transition = useSharedValue(0);

  // Password Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetUserId, setResetUserId] = useState('');

  const scrollFocusedInputIntoView = (input: TextInput | null) => {
    if (!input) return;
    requestAnimationFrame(() => {
      const scrollResponder = scrollViewRef.current as (ScrollView & {
        scrollResponderScrollNativeHandleToKeyboard?: (node: number, additionalOffset: number, preventNegativeScrollOffset: boolean) => void;
      }) | null;
      const inputNode = findNodeHandle(input);
      if (inputNode !== null && scrollResponder?.scrollResponderScrollNativeHandleToKeyboard) {
        scrollResponder.scrollResponderScrollNativeHandleToKeyboard(inputNode, verticalScale(28), true);
      } else {
        scrollResponder?.scrollToEnd({ animated: true });
      }
    });
  };

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
    if (step === 'pin' || loading) return;
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    Keyboard.dismiss();
    setStep('pin');
    if (!reduceMotion) {
    transition.value = withTiming(1, { duration: 240, reduceMotion: ReduceMotion.System });
      requestAnimationFrame(() => pinInputRef.current?.focus());
    } else {
      transition.value = 1;
      requestAnimationFrame(() => pinInputRef.current?.focus());
    }
  };

  const handleBack = () => {
    if (loading) return;
    setError('');
    setStep('email');
    transition.value = reduceMotion ? 0 : withTiming(0, { duration: 200, reduceMotion: ReduceMotion.System });
    setPassword(''); // Clear PIN when going back
  };

  const handleLogin = async () => {
    if (submitInProgress.current || loading) return;
    if (password.length < 4) {
      setError('Please enter your 4-digit PIN');
      if (!reduceMotion) pinFeedback.value = withSequence(
        withTiming(1, { duration: 45, reduceMotion: ReduceMotion.System }),
        withTiming(-1, { duration: 65, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 65, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 80, reduceMotion: ReduceMotion.System }),
      );
      return;
    }

    setError('');
    submitInProgress.current = true;
    authSucceeded.current = false;
    setLoading(true);

    try {
      const finalPassword = translatePinToPassword(password);
      const result = await login(email, finalPassword, keepSignedIn);

      if (result.requirePasswordReset) {
        setResetUserId(result.userId || '');
        setResetModalVisible(true);
        return;
      }

      if (result.success) {
        authSucceeded.current = true;
        setPinSuccess(true);
        return;
      }

      setError(result.error || 'Invalid PIN. Please try again.');
      setPassword('');
      if (!reduceMotion) pinFeedback.value = withSequence(
        withTiming(1, { duration: 45, reduceMotion: ReduceMotion.System }),
        withTiming(-1, { duration: 65, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 65, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 80, reduceMotion: ReduceMotion.System }),
      );
    } catch {
      setError('Unable to sign in. Please try again.');
      setPassword('');
    } finally {
      submitInProgress.current = false;
      if (!authSucceeded.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading || !authSucceeded.current) return;
    const timeout = setTimeout(() => {
      if (authSucceeded.current) {
        authSucceeded.current = false;
        setLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const pinEntryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: reduceMotion ? 0 : pinFeedback.value * 8,
    }],
  }));

  const pinSlotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinFocused && !reduceMotion ? 1.015 : 1 }],
  }));

  // Resolve responsive JS helpers before entering the UI runtime worklets.
  const keyboardFormOffset = verticalScale(65);

  const keyboardFormStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(keyboard.height.value - keyboardFormOffset, 0) }],
  }));

  const keyboardCoverStyle = useAnimatedStyle(() => ({
    height: keyboard.height.value,
    transform: [{ translateY: -Math.max(keyboard.height.value - keyboardFormOffset, 0) }],
  }));

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={loading ? 'dark-content' : 'light-content'}
        backgroundColor={loading ? '#F8FAFC' : '#0A2B4D'}
        translucent={false}
      />
      <View testID="login_hero_image" style={[styles.heroBackground, { height: heroHeight }]}>
        <Image
          testID="login_hero_rider"
          source={loginHero}
          resizeMode="stretch"
          style={[styles.heroImage, { width: heroImageWidth, height: heroHeight, left: -heroImageWidth * 0.43 }]}
        />
        <View style={styles.heroShade} />
        <View testID="login_hero_top_row" style={[styles.heroTopRow, { paddingTop: (StatusBar.currentHeight ?? verticalScale(24)) + verticalScale(6) }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry connection check" onPress={() => void retryConnection()} style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig[serverStatus].color }]} />
            <Text style={styles.statusText}>{statusConfig[serverStatus].label}</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>RIDER APP</Text>
        </View>
        <View
          testID="login_brand_lockup"
          style={[styles.heroBrandLockup, { top: (StatusBar.currentHeight ?? verticalScale(24)) + verticalScale(20) }]}
        >
          <Image
            testID="login_brand_wordmark"
            source={errandsWordmark}
            resizeMode="contain"
            style={[styles.heroBrand, compactLayout && styles.compactHeroBrand]}
          />
          <View testID="login_hero_message" style={styles.heroMessage}>
            <Text style={styles.heroMessageText}>Delivering tasks,</Text>
            <Text style={styles.heroMessageText}>together.</Text>
          </View>
        </View>
        <Svg
          testID="login_hero_curve"
          width="100%"
          height={verticalScale(65)}
          viewBox="0 0 400 65"
          preserveAspectRatio="none"
          style={styles.heroCurve}
        >
          <Path
            d="M 0 25 C 80 -5, 135 45, 215 25 C 290 5, 345 5, 400 25 L 400 65 L 0 65 Z"
            fill={loginSurfaceColor}
          />
        </Svg>
      </View>

      <Image
        testID="login_footer_image"
        source={loginRoadFooter}
        resizeMode="cover"
        style={[styles.footerImage, styles.footerImageContent, compactLayout && styles.compactFooterImage]}
      />

      <Animated.View
        testID="login_keyboard_cover"
        pointerEvents="none"
        style={[styles.keyboardCover, keyboardCoverStyle]}
      />
      <Animated.View style={[styles.keyboardFormLayer, keyboardFormStyle]}>
        <KeyboardAvoidingView
          testID="login_keyboard_container"
          behavior={undefined}
          keyboardVerticalOffset={0}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            testID="login_scroll_view"
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(heroHeight - verticalScale(24), verticalScale(compactLayout ? 132 : 180)),
                paddingBottom: verticalScale(24),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={false}
          >
            <View style={[styles.content, { minHeight: Math.max(height - heroHeight + verticalScale(28), 0) }]}>
                <View testID="login_form_card" style={[styles.formContainer, compactLayout && styles.compactFormContainer]}>
                {error ? (
                  <View style={styles.errorContainer} accessibilityRole="alert">
                    <MaterialIcons name="error-outline" size={moderateScale(18)} color="#B91C1C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.formHeader}>
                  <Text style={styles.title}>{step === 'email' ? 'Welcome Back!' : 'Enter Your PIN'}</Text>
                  <Text style={[styles.subtitle, compactLayout && styles.compactSubtitle]}>
                    {step === 'email' ? 'Sign in to continue to your account.' : 'Enter your 4-digit PIN to access your account.'}
                  </Text>
                </View>

                <View style={[styles.stepsWrapper, compactLayout && styles.compactStepsWrapper]}>
                  {step === 'email' ? (
                    <Animated.View style={emailStepStyle}>
                      <View style={[styles.inputGroup, compactLayout && styles.compactInputGroup]}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                          <MaterialIcons name="mail-outline" size={moderateScale(21)} color="#647A99" style={styles.inputIcon} />
                          <TextInput
                            ref={emailInputRef}
                            testID="login_email_input"
                            accessibilityLabel="Email Address"
                            style={styles.input}
                            placeholder="youremail@domain.com"
                            placeholderTextColor="#8FA2BD"
                            value={email}
                            onChangeText={(value) => { setEmail(value); setError(''); }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            autoComplete="email"
                            returnKeyType="next"
                            onFocus={() => scrollFocusedInputIntoView(emailInputRef.current)}
                            onSubmitEditing={handleNext}
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        testID="login_continue_button"
                        accessibilityRole="button"
                        style={styles.primaryButton}
                        onPress={handleNext}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#635BFF', '#7C2CF5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButtonGradient}>
                          <View style={styles.primaryButtonContent}>
                            <Text style={styles.primaryButtonText}>Continue</Text>
                            <MaterialIcons name="arrow-forward" size={moderateScale(22)} color="#FFFFFF" />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  ) : (
                    <Animated.View style={pinStepStyle}>
                      <View style={styles.emailSummary}>
                        <MaterialIcons name="mail-outline" size={moderateScale(20)} color="#647A99" />
                        <Text style={styles.emailSummaryText} numberOfLines={1}>{email}</Text>
                        <TouchableOpacity
                          testID="login_change_email_button"
                          accessibilityRole="button"
                          accessibilityLabel="Change email address"
                          style={styles.changeButton}
                          onPress={handleBack}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.changeButtonText}>Change</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.pinLabel, compactLayout && styles.compactPinLabel]}>4-DIGIT PIN</Text>
                      <Animated.View style={[styles.pinEntryContainer, pinEntryAnimatedStyle]}>
                        <Animated.View style={[styles.pinSlots, pinSlotsAnimatedStyle]} accessible={false}>
                          {[0, 1, 2, 3].map((index) => (
                            <View
                              key={index}
                              testID={`login_pin_slot_${index}`}
                              accessibilityLabel={`PIN digit ${index + 1}`}
                              style={[
                                styles.pinSlot,
                                (index === password.length || pinFocused && password.length === 4 && index === 3) && styles.pinSlotActive,
                                pinSuccess && styles.pinSlotSuccess,
                                password.length > index && styles.pinSlotFilled,
                              ]}
                            >
                              <Text style={[styles.pinSlotDot, password.length > index && styles.pinSlotDotFilled]}>
                                {password.length > index ? '●' : ''}
                              </Text>
                            </View>
                          ))}
                        </Animated.View>
                        <TextInput
                          ref={pinInputRef}
                          testID="login_pin_input"
                          accessibilityLabel="4-digit PIN"
                          accessibilityHint="Enter four digits using the numeric keyboard"
                          accessibilityRole="text"
                          style={styles.pinInputOverlay}
                          value={password}
                          onChangeText={(value) => { setPassword(value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={4}
                          autoComplete="off"
                          textContentType="oneTimeCode"
                          caretHidden
                          selectionColor="transparent"
                          onFocus={() => { setPinFocused(true); scrollFocusedInputIntoView(pinInputRef.current); }}
                          onBlur={() => setPinFocused(false)}
                          editable={!loading}
                        />
                      </Animated.View>

                      <View testID="login_pin_options_row" style={styles.pinOptionsRow}>
                        <TouchableOpacity
                          testID="login_keep_signed_in_checkbox"
                          accessibilityRole="checkbox"
                          accessibilityLabel="Keep me signed in on this device"
                          accessibilityState={{ checked: keepSignedIn }}
                          style={styles.keepSignedInControl}
                          onPress={() => setKeepSignedIn((current) => !current)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.keepSignedInBox, keepSignedIn && styles.keepSignedInBoxChecked]}>
                            {keepSignedIn && <MaterialIcons name="check" size={moderateScale(15)} color="#FFFFFF" />}
                          </View>
                          <Text style={styles.keepSignedInText}>Keep me signed in</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          testID="login_forgot_pin_button"
                          accessibilityRole="button"
                          style={styles.forgotPinButton}
                          onPress={() => Alert.alert(
                            'Need Assistance?',
                            'Please contact your dispatch supervisor for PIN/Email verification support.',
                          )}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.forgotPinText}>Forgot your PIN?</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        testID="login_sign_in_button"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: password.length !== 4 || loading }}
                        disabled={password.length !== 4 || loading}
                        style={[styles.primaryButton, (password.length !== 4 || loading) && styles.buttonDisabled]}
                        onPress={handleLogin}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#635BFF', '#7C2CF5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButtonGradient}>
                          <View style={styles.primaryButtonContent}>
                            {loading ? <ActivityIndicator testID="login_submit_spinner" color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
                            {!loading && <MaterialIcons name="arrow-forward" size={moderateScale(22)} color="#FFFFFF" />}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>

                <TouchableOpacity
                  testID="login_support_button"
                  accessibilityRole="button"
                  style={styles.supportButton}
                  onPress={() => Alert.alert(
                    'Need Assistance?',
                    'Please contact your dispatch supervisor for PIN/Email verification support.',
                  )}
                  activeOpacity={0.75}
                >
                  <Text style={styles.supportText}>Help & Support</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
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
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  keyboardFormLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  keyboardCover: {
    position: 'absolute',
    zIndex: 1,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: loginSurfaceColor,
    borderTopLeftRadius: moderateScale(30),
    borderTopRightRadius: moderateScale(30),
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: scale(20),
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(7, 31, 55, 0.72)',
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  statusDot: {
    width: moderateScale(7),
    height: moderateScale(7),
    borderRadius: moderateScale(4),
    marginRight: scale(8),
  },
  statusText: {
    fontSize: normalizeFontSize(10),
    fontWeight: '800',
    color: '#FFFFFF',
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
    fontSize: normalizeFontSize(27),
    fontWeight: '900',
    color: '#102544',
    letterSpacing: -0.8,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: normalizeFontSize(15),
    color: '#5F7594',
    marginTop: verticalScale(4),
    marginBottom: verticalScale(18),
    alignSelf: 'stretch',
  },
  compactSubtitle: {
    marginBottom: verticalScale(8),
  },
  formContainer: {
    position: 'relative',
    backgroundColor: loginSurfaceColor,
    borderRadius: moderateScale(30),
    paddingHorizontal: moderateScale(22),
    paddingTop: moderateScale(40),
    paddingBottom: moderateScale(14),
    borderWidth: 0,
    minHeight: verticalScale(360),
    overflow: 'visible',
  },
  compactFormContainer: {
    minHeight: 0,
    paddingTop: moderateScale(18),
    paddingBottom: moderateScale(8),
    borderRadius: moderateScale(22),
  },
  heroCurve: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
  },
  stepsWrapper: {
    flex: 1,
  },
  compactStepsWrapper: {
    flex: 0,
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
    color: '#991B1B',
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
    marginLeft: scale(8),
    flex: 1,
  },
  inputGroup: {
    marginBottom: verticalScale(24),
  },
  compactInputGroup: {
    marginBottom: verticalScale(12),
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D7E2F1',
    borderRadius: moderateScale(15),
    paddingHorizontal: scale(16),
    height: Math.max(verticalScale(58), 48),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: normalizeFontSize(16),
    color: '#102544',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#702CF6',
    height: Math.max(verticalScale(58), 48),
    borderRadius: moderateScale(17),
    overflow: 'hidden',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(17),
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
    fontSize: normalizeFontSize(12),
    fontWeight: '800',
    color: '#526987',
    letterSpacing: 0.6,
    marginTop: verticalScale(22),
    marginBottom: verticalScale(12),
    textAlign: 'left',
  },
  compactPinLabel: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(8),
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(28),
  },
  pinLoadingText: {
    marginTop: verticalScale(12),
    fontSize: normalizeFontSize(14),
    fontWeight: '700',
    color: '#102544',
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
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0A2B4D',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 35, 67, 0.16)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(10),
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroBrandLockup: {
    position: 'absolute',
    left: scale(22),
    width: moderateScale(164),
    zIndex: 2,
  },
  heroMessage: {
    maxWidth: '100%',
    marginTop: -verticalScale(22),
  },
  heroMessageText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(18),
    lineHeight: normalizeFontSize(23),
    fontWeight: '800',
    textShadowColor: 'rgba(0, 21, 42, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  footerImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: verticalScale(320),
  },
  compactFooterImage: {
    height: verticalScale(190),
  },
  footerImageContent: {
    resizeMode: 'cover',
    opacity: 0.92,
  },
  scrollView: {
    flex: 1,
  },
  formHeader: {
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  heroBrand: {
    width: moderateScale(150),
    height: moderateScale(150),
  },
  compactHeroBrand: {
    width: moderateScale(100),
    height: moderateScale(100),
  },
  emailSummary: {
    minHeight: Math.max(verticalScale(52), 48),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(13),
    borderWidth: 1.5,
    borderColor: '#D7E2F1',
    borderRadius: moderateScale(15),
    backgroundColor: '#FFFFFF',
  },
  emailSummaryText: {
    flex: 1,
    color: '#536A89',
    fontSize: normalizeFontSize(14),
    fontWeight: '600',
  },
  changeButton: {
    minWidth: moderateScale(56),
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  changeButtonText: {
    color: '#702CF6',
    fontSize: normalizeFontSize(14),
    fontWeight: '800',
  },
  pinEntryContainer: {
    position: 'relative',
    minHeight: Math.max(verticalScale(58), 48),
    justifyContent: 'center',
  },
  pinSlots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(7),
  },
  pinSlot: {
    flex: 1,
    minWidth: 0,
    height: Math.max(verticalScale(58), 48),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D7E2F1',
    borderRadius: moderateScale(13),
    backgroundColor: '#FFFFFF',
    shadowColor: '#17355B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 1,
  },
  pinSlotActive: {
    borderWidth: 2,
    borderColor: '#702CF6',
  },
  pinSlotFilled: {
    borderColor: '#A78BFA',
    backgroundColor: '#FAF8FF',
  },
  pinSlotSuccess: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  pinSlotDot: {
    color: '#8396B2',
    fontSize: normalizeFontSize(20),
    lineHeight: normalizeFontSize(24),
  },
  pinSlotDotFilled: {
    color: '#702CF6',
  },
  pinInputOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.02,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 1,
  },
  forgotPinButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 0,
    marginBottom: 0,
  },
  pinOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(6),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(4),
  },
  keepSignedInControl: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flexShrink: 1,
  },
  keepSignedInBox: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderWidth: 1.5,
    borderColor: '#8FA2BD',
    borderRadius: moderateScale(5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  keepSignedInBoxChecked: {
    backgroundColor: '#702CF6',
    borderColor: '#702CF6',
  },
  keepSignedInText: {
    color: '#536A89',
    fontSize: normalizeFontSize(12),
    fontWeight: '600',
  },
  forgotPinText: {
    color: '#702CF6',
    fontSize: normalizeFontSize(12),
    fontWeight: '800',
  },
  primaryButtonGradient: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  supportButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  supportText: {
    color: '#617895',
    fontSize: normalizeFontSize(13),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  loadingState: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  loadingLogo: {
    width: moderateScale(118),
    height: moderateScale(118),
  },
  loadingIndicator: {
    marginTop: verticalScale(38),
  },
  loadingText: {
    color: '#536A89',
    fontSize: normalizeFontSize(15),
    fontWeight: '600',
    marginTop: verticalScale(14),
  },
});
