import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Config } from '@/constants/Config';

const AT_KEY = 'userToken';
const RT_KEY = 'refreshToken';
const UD_KEY = 'userData';
const KEEP_SIGNED_IN_KEY = 'keepSignedIn';
let refreshInFlight: Promise<string | null> | null = null;
type RefreshFailure = {
  kind: 'missing' | 'malformed' | 'invalid' | 'network';
  status?: number;
  message?: string;
};
let lastRefreshFailure: RefreshFailure | null = null;

export const getLastRefreshFailure = () => lastRefreshFailure;

const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );

    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const AuthManager = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(AT_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(RT_KEY);
  },

  async saveTokensOnly(token: string, refreshToken: string) {
    await SecureStore.setItemAsync(AT_KEY, token);
    await SecureStore.setItemAsync(RT_KEY, refreshToken);
  },

  async saveSession(token: string, refreshToken: string, userData: any, keepSignedIn = true) {
    await this.saveTokensOnly(token, refreshToken);
    await SecureStore.setItemAsync(UD_KEY, JSON.stringify(userData));
    await SecureStore.setItemAsync(KEEP_SIGNED_IN_KEY, String(keepSignedIn));
  },

  async shouldRestoreSession(): Promise<boolean> {
    const preference = await SecureStore.getItemAsync(KEEP_SIGNED_IN_KEY);
    // Preserve existing sessions created before this preference was introduced.
    return preference !== 'false';
  },

  async clearSession() {
    await SecureStore.deleteItemAsync(AT_KEY);
    await SecureStore.deleteItemAsync(RT_KEY);
    await SecureStore.deleteItemAsync(UD_KEY);
    await SecureStore.deleteItemAsync(KEEP_SIGNED_IN_KEY);
  },

  async getUserData() {
    const data = await SecureStore.getItemAsync(UD_KEY);
    return data ? JSON.parse(data) : null;
  },

  async saveUserData(userData: unknown) {
    await SecureStore.setItemAsync(UD_KEY, JSON.stringify(userData));
  },

  async isAccessTokenExpired(bufferMs = 60000): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return true;

    const payload = decodeJwtPayload(accessToken);
    if (!payload?.exp || typeof payload.exp !== 'number') return true;

    return payload.exp * 1000 < Date.now() + bufferMs;
  },

  refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
    lastRefreshFailure = null;
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      lastRefreshFailure = { kind: 'missing', message: 'No refresh token is stored' };
      return null;
    }

    try {
      const response = await axios.post(`${Config.API_URL}/api/auth/refresh`, {
        refreshToken,
      });
      const { token: newAccessToken, refreshToken: newRefreshToken } =
        response.data || {};

      if (!newAccessToken || !newRefreshToken) {
        lastRefreshFailure = { kind: 'malformed', message: 'Refresh response did not contain both tokens' };
        return null;
      }

      await this.saveTokensOnly(newAccessToken, newRefreshToken);
      return newAccessToken;
    } catch (error: any) {
      console.warn('[AUTH] Refresh request failed', {
        status: error?.response?.status,
        code: error?.response?.data?.code,
        error: error?.response?.data?.error || error?.message,
      });
      lastRefreshFailure = {
        kind: error?.response ? 'invalid' : 'network',
        status: error?.response?.status,
        message: error?.response?.data?.error || error?.message,
      };
      return null;
    }
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  },

  async getValidToken(): Promise<string | null> {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();

    if (!accessToken || !refreshToken) return null;
    if (await this.isAccessTokenExpired()) {
      return this.refreshAccessToken();
    }

    return accessToken;
  },
};
