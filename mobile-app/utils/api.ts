import axios from 'axios';
import { Config } from '@/constants/Config';
import { AuthManager } from '@/utils/AuthManager';

let isRefreshing = false;
let failedQueue: any[] = [];
let hasHandledAuthFailure = false;

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

let onAuthFailure: (() => void) | null = null;

const handleAuthFailure = async () => {
  if (hasHandledAuthFailure) return;

  hasHandledAuthFailure = true;
  await AuthManager.clearSession();
  onAuthFailure?.();
};

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'x-client-type': 'mobile' },
});

export const setAuthFailureListener = (callback: () => void) => { onAuthFailure = callback; };
export const resetAuthStatus = () => {
  isRefreshing = false;
  failedQueue = [];
  hasHandledAuthFailure = false;
};
export const wakeUpServer = async () => { try { await api.get('/api/ping', { timeout: 45000 }); } catch (error) {} };

api.interceptors.request.use(async (config) => {
  const token = await AuthManager.getAccessToken();
  if (token && token.includes('.') && !token.startsWith('rider_')) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error.config;

  if (!originalRequest || error.response?.status !== 401) {
    return Promise.reject(error);
  }

  if (originalRequest.url?.includes('/api/auth/refresh')) {
    await handleAuthFailure();
    return Promise.reject(error);
  }

  if (!originalRequest._retry) {
    if (isRefreshing) {
      return new Promise(function(resolve, reject) {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers['Authorization'] = 'Bearer ' + token;
        return api(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAT = await AuthManager.refreshAccessToken();
      if (!newAT) throw new Error('Refresh failed');

      processQueue(null, newAT);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers['Authorization'] = 'Bearer ' + newAT;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await handleAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }

  return Promise.reject(error);
});
