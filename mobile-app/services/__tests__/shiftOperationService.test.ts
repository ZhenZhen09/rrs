import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyCommittedDutyResult, clearShiftOperationId, getOrCreateShiftOperationId } from '../shiftOperationService';

let mockId = 0;
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => `stable-test-id-${++mockId}`) }));

describe('shift operation IDs', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('keeps the same ID until a definitive response clears it', async () => {
    const first = await getOrCreateShiftOperationId('end');
    expect(await getOrCreateShiftOperationId('end')).toBe(first);
    await clearShiftOperationId('end');
    expect(await getOrCreateShiftOperationId('end')).not.toBe(first);
  });

  it('applies a committed server state even if saving the local cache fails', async () => {
    const setItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('cache unavailable'));
    const removeItem = jest.spyOn(AsyncStorage, 'removeItem');
    const setDuty = jest.fn();
    await expect(applyCommittedDutyResult('end', false, setDuty)).resolves.toBe(false);
    expect(setDuty).toHaveBeenCalledWith(false);
    expect(setItem).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledWith('@pending_shift_operation_end');
  });
});
