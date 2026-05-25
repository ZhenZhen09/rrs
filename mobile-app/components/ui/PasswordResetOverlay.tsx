import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { api } from '@/utils/api';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordResetOverlay({ visible, userId, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const validation = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: password.length > 0 && password === confirmPassword
  };

  const score = [validation.length, validation.number, validation.special].filter(Boolean).length;
  const isReady = score === 3 && validation.match;

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await api.post('/api/auth/update-password', {
        userId: userId,
        newPassword: password
      });
      setLoading(false);
      onSuccess();
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.title, { color: themeColors.text }]}>Secure Your Account</Text>
          <Text style={styles.subtitle}>Please set a new private password to continue.</Text>

          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: colorScheme === 'dark' ? themeColors.cardBackground : '#F8FAFC',
              borderColor: themeColors.border
            }
          ]}>
             <TextInput 
              ref={inputRef}
              style={[styles.input, { color: themeColors.text }]}
              placeholder="New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
             />
             <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
               <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#94A3B8" />
             </TouchableOpacity>
          </View>

          <PasswordStrengthMeter score={score} />

          <View style={styles.checklist}>
            <CheckItem label="At least 8 characters" valid={validation.length} />
            <CheckItem label="Includes 1 number" valid={validation.number} />
            <CheckItem label="Includes 1 special char" valid={validation.special} />
          </View>

          <View style={[
            styles.inputContainer, 
            validation.match && styles.inputMatch,
            { 
              backgroundColor: colorScheme === 'dark' ? themeColors.cardBackground : '#F8FAFC',
              borderColor: validation.match ? themeColors.success : themeColors.border
            }
          ]}>
             <TextInput 
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Confirm Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
             />
             {validation.match && <MaterialIcons name="check-circle" size={20} color="#10B981" />}
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: themeColors.tint }, !isReady && styles.buttonDisabled]} 
            disabled={!isReady || loading}
            onPress={handleUpdate}
            accessibilityRole="button"
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Update & Access Dashboard</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CheckItem({ label, valid }: { label: string, valid: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  
  return (
    <View style={styles.checkItem}>
      <MaterialIcons name={valid ? "check-circle" : "radio-button-unchecked"} size={16} color={valid ? "#10B981" : "#CBD5E1"} />
      <Text style={[
        styles.checkText, 
        valid && styles.checkTextValid,
        valid && { color: themeColors.text }
      ]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', 
    padding: scale(20) 
  },
  card: { 
    borderRadius: moderateScale(28), 
    padding: moderateScale(24), 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 20, 
    elevation: 5 
  },
  title: { 
    fontSize: normalizeFontSize(22), 
    fontWeight: '800', 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: normalizeFontSize(14), 
    color: '#64748B', 
    textAlign: 'center', 
    marginVertical: verticalScale(8), 
    marginBottom: verticalScale(20) 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: moderateScale(16), 
    paddingHorizontal: scale(16), 
    height: verticalScale(56), 
    marginBottom: verticalScale(12), 
    borderWidth: 1 
  },
  inputMatch: { borderColor: '#10B981' },
  input: { 
    flex: 1, 
    fontSize: normalizeFontSize(16), 
    fontWeight: '600' 
  },
  checklist: { marginBottom: verticalScale(20) },
  checkItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: verticalScale(6) 
  },
  checkText: { 
    fontSize: normalizeFontSize(13), 
    color: '#94A3B8', 
    marginLeft: scale(8) 
  },
  checkTextValid: { 
    fontWeight: '600' 
  },
  button: { 
    height: verticalScale(56), 
    borderRadius: moderateScale(16), 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: verticalScale(10) 
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { 
    color: '#FFF', 
    fontSize: normalizeFontSize(16), 
    fontWeight: '700' 
  }
});
