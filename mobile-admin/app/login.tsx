import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function AdminLoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const transition = useSharedValue(0);

  const handleNext = () => {
    // UI-Only: Transition regardless of input for testing
    setStep('pin');
    transition.value = withSpring(1, { damping: 15, stiffness: 100 });
  };

  const handleBack = () => {
    setStep('email');
    transition.value = withSpring(0, { damping: 15, stiffness: 100 });
    setPassword('');
  };

  const handleNumberPress = (num: string) => {
    if (password.length < 4) {
      setPassword(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  // UI-Only: Auto-login after 4 digits for testing (requires 0000)
  useEffect(() => {
    if (password.length === 4) {
      if (password === '0000') {
        const timer = setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
        return () => clearTimeout(timer);
      } else {
        // Wrong PIN: Clear and vibrate/shake (optional)
        const timer = setTimeout(() => {
          setPassword('');
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [password]);

  const emailStepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(transition.value, [0, 1], [0, -width], Extrapolate.CLAMP) }],
    opacity: interpolate(transition.value, [0, 0.5], [1, 0], Extrapolate.CLAMP),
    display: transition.value > 0.9 ? 'none' : 'flex',
  }));

  const pinStepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(transition.value, [0, 1], [width, 0], Extrapolate.CLAMP) }],
    opacity: interpolate(transition.value, [0.5, 1], [0, 1], Extrapolate.CLAMP),
    display: transition.value < 0.1 ? 'none' : 'flex',
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              <MaterialIcons name="admin-panel-settings" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Admin Control</Text>
            <Text style={styles.subtitle}>System Management Portal</Text>
          </View>

          <View style={styles.formContainer}>
            {/* STEP 1: EMAIL */}
            <Animated.View style={[styles.stepWrapper, emailStepStyle]}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin Email</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="alternate-email" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="admin@company.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </Animated.View>

            {/* STEP 2: PIN */}
            <Animated.View style={[styles.stepWrapper, pinStepStyle]}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={20} color="#64748B" />
                <Text style={styles.backButtonText}>{email || 'admin@company.com'}</Text>
              </TouchableOpacity>
              <View style={styles.pinHeader}>
                <Text style={styles.pinLabel}>ENTER SECURE PIN</Text>
                <View style={styles.pinDotsRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.pinDot, password.length >= i && styles.pinDotFilled]} />
                  ))}
                </View>
              </View>
              
              <View style={styles.numberGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <TouchableOpacity 
                    key={num} 
                    style={styles.numberButton} 
                    onPress={() => handleNumberPress(num.toString())}
                  >
                    <Text style={styles.numberButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.numberButton} />
                <TouchableOpacity style={styles.numberButton} onPress={() => handleNumberPress('0')}>
                  <Text style={styles.numberButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.numberButton} onPress={handleDelete}>
                  <MaterialIcons name="backspace" size={22} color="#475569" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#1E293B',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  formContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0', minHeight: 480,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  stepWrapper: { width: '100%' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#1E293B', height: 56, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 20,
  },
  backButtonText: { marginLeft: 6, fontSize: 12, color: '#64748B', fontWeight: '600' },
  pinHeader: { alignItems: 'center', marginBottom: 24 },
  pinLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 12 },
  pinDotsRow: { flexDirection: 'row', justifyContent: 'center' },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#E2E8F0', marginHorizontal: 10 },
  pinDotFilled: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  numberGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  numberButton: {
    width: '28%', aspectRatio: 1.5, justifyContent: 'center', alignItems: 'center',
    margin: '2.5%', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9',
  },
  numberButtonText: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
});
