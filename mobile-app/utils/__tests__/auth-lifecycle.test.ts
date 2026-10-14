import { AuthManager, getLastRefreshFailure } from '../AuthManager';
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
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userData');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('keepSignedIn');
    });
  });

  describe('Keep signed in preference', () => {
    it('stores the keep-signed-in choice with the session', async () => {
      await AuthManager.saveSession('access', 'refresh', { id: 'rider-1' }, false);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('keepSignedIn', 'false');
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('false');
      await expect(AuthManager.shouldRestoreSession()).resolves.toBe(false);
    });

    it('continues restoring legacy sessions without a stored preference', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(AuthManager.shouldRestoreSession()).resolves.toBe(true);
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

    it('classifies network refresh failures without treating them as invalid credentials', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('old-refresh-token');
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network unavailable'));

      await AuthManager.refreshAccessToken();

      expect(getLastRefreshFailure()).toEqual(expect.objectContaining({ kind: 'network' }));
    });

    it('🛑 ALERT: Should handle malformed refresh response without crashing', async () => {
       (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('refresh-ok');
       (axios.post as jest.Mock).mockResolvedValue({ data: { status: 'weird' } }); // Missing tokens

       const result = await AuthManager.refreshAccessToken();
       expect(result).toBeNull();
    });

    it('shares one refresh request when callers refresh concurrently', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('refresh-ok');
      let resolveRefresh: ((value: any) => void) | undefined;
      (axios.post as jest.Mock).mockReturnValue(new Promise((resolve) => {
        resolveRefresh = resolve;
      }));

      const first = AuthManager.refreshAccessToken();
      const second = AuthManager.refreshAccessToken();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(axios.post).toHaveBeenCalledTimes(1);

      resolveRefresh?.({ data: { token: 'new-access', refreshToken: 'new-refresh' } });
      await expect(Promise.all([first, second])).resolves.toEqual([
        'new-access',
        'new-access',
      ]);
    });

    it('returns a refreshed access token before an expired token is used', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'userToken') return 'expired.access.token';
        if (key === 'refreshToken') return 'refresh-ok';
        return null;
      });
      (axios.post as jest.Mock).mockResolvedValue({
        data: { token: 'fresh-access', refreshToken: 'fresh-refresh' },
      });

      await expect(AuthManager.getValidToken()).resolves.toBe('fresh-access');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        { refreshToken: 'refresh-ok' },
      );
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
