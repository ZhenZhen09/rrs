import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { CONFIG } from '../constants/Config';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenStorage';

const api = axios.create({
  baseURL: CONFIG.API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios.post(`${CONFIG.API_URL}/auth/refresh`, { refreshToken })
      .then(async (response) => {
        const { token, refreshToken: nextRefreshToken } = response.data || {};
        if (!token) throw new Error('Refresh response did not include an access token');
        await saveTokens(token, nextRefreshToken);
        return token as string;
      })
      .catch(async (error: AxiosError) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          await clearTokens();
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const token = await refreshAccessToken();
    if (!token) return Promise.reject(error);

    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  },
);

export default api;
