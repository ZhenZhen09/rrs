import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const keyFor = (kind: 'start' | 'end') => `@pending_shift_operation_${kind}`;

export async function getOrCreateShiftOperationId(kind: 'start' | 'end'): Promise<string> {
  const key = keyFor(kind);
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(key, id);
  return id;
}

export async function clearShiftOperationId(kind: 'start' | 'end'): Promise<void> {
  await AsyncStorage.removeItem(keyFor(kind));
}

export async function applyCommittedDutyResult(
  kind: 'start' | 'end',
  isOnDuty: boolean,
  applyState: (value: boolean) => void,
): Promise<boolean> {
  applyState(isOnDuty);
  try {
    await AsyncStorage.setItem('@is_on_duty', isOnDuty ? 'true' : 'false');
  } catch (error) {
    console.warn('[shiftOperationService] Duty cache write failed after server confirmation:', error);
  }
  try {
    await clearShiftOperationId(kind);
  } catch (error) {
    console.warn('[shiftOperationService] Could not clear completed shift operation ID:', error);
  }
  return isOnDuty;
}
