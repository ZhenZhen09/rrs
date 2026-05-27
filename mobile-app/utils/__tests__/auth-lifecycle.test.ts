import { AuthManager } from '../AuthManager';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Enterprise-Level Mocking
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios');

describe('Intensive Audit: Auth Lifecycle Security', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Wiping', () => {
    it('✅ PASS: clearSession must delete all 3 keys (Token, Refresh, UserData)', async () => {
      await AuthManager.clearSession();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userData');
    });
  });

  describe('Refresh Token Resilience', () => {
    it('✅ PASS: Should return null if refresh API fails (No token leakage)', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('old-refresh-token');
      (axios.post as jest.Mock).mockRejectedValue(new Error('API Down'));

      const result = await AuthManager.refreshAccessToken();
      expect(result).toBeNull();
      // Should NOT have called setItemAsync if refresh failed
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('🛑 ALERT: Should handle malformed refresh response without crashing', async () => {
       (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('refresh-ok');
       (axios.post as jest.Mock).mockResolvedValue({ data: { status: 'weird' } }); // Missing tokens

       const result = await AuthManager.refreshAccessToken();
       expect(result).toBeNull();
    });
  });

  describe('Expiry Edge Cases', () => {
    it('✅ PASS: Should consider null token as expired', async () => {
       (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
       const isExpired = await AuthManager.isAccessTokenExpired();
       expect(isExpired).toBe(true);
    });

    it('✅ PASS: Should handle non-JWT garbage strings without crashing', async () => {
       (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('GARBAGE-STRING');
       const isExpired = await AuthManager.isAccessTokenExpired();
       expect(isExpired).toBe(true);
    });
  });
});
