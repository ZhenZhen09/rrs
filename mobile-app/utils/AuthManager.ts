import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Config } from '@/constants/Config';

const AT_KEY = 'userToken';
const RT_KEY = 'refreshToken';
const UD_KEY = 'userData';

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

  async saveSession(token: string, refreshToken: string, userData: any) {
    await this.saveTokensOnly(token, refreshToken);
    await SecureStore.setItemAsync(UD_KEY, JSON.stringify(userData));
  },

  async clearSession() {
    await SecureStore.deleteItemAsync(AT_KEY);
    await SecureStore.deleteItemAsync(RT_KEY);
    await SecureStore.deleteItemAsync(UD_KEY);
  },

  async getUserData() {
    const data = await SecureStore.getItemAsync(UD_KEY);
    return data ? JSON.parse(data) : null;
  },

  async isAccessTokenExpired(bufferMs = 60000): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return true;

    const payload = decodeJwtPayload(accessToken);
    if (!payload?.exp || typeof payload.exp !== 'number') return true;

    return payload.exp * 1000 < Date.now() + bufferMs;
  },

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await axios.post(`${Config.API_URL}/api/auth/refresh`, {
        refreshToken,
      });
      const { token: newAccessToken, refreshToken: newRefreshToken } =
        response.data || {};

      if (!newAccessToken || !newRefreshToken) {
        return null;
      }

      await this.saveTokensOnly(newAccessToken, newRefreshToken);
      return newAccessToken;
    } catch {
      return null;
    }
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
