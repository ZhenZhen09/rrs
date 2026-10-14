import axios from 'axios';
import { Config } from '@/constants/Config';
import { AuthManager, getLastRefreshFailure } from '@/utils/AuthManager';
import { getBearerToken, isCurrentAuthenticatedRequest } from '@/utils/authRequestGuard';

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

const handleAuthFailure = async (reason?: unknown, expectedToken?: string) => {
  if (expectedToken) {
    const currentToken = await AuthManager.getAccessToken();
    if (!isCurrentAuthenticatedRequest(expectedToken, currentToken)) return;
  }
  if (hasHandledAuthFailure) return;

  hasHandledAuthFailure = true;
  console.warn('[AUTH] Session invalidated', reason);
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
  // Refresh proactively so normal requests do not send a known-expired JWT
  // and trigger a preventable 401/retry cycle.
  const token = await AuthManager.getValidToken();
  if (token && token.includes('.') && !token.startsWith('rider_')) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error.config;

  if (error.response?.status === 403) {
    console.warn('[AUTH] Request forbidden', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      code: error.response?.data?.code,
      error: error.response?.data?.error,
    });
  }

  if (!originalRequest || error.response?.status !== 401) {
    return Promise.reject(error);
  }

  const requestToken = getBearerToken(originalRequest.headers);
  const currentToken = await AuthManager.getAccessToken();
  if (!isCurrentAuthenticatedRequest(requestToken, currentToken)) {
    return Promise.reject(error);
  }

  console.warn('[AUTH] Request rejected with 401', {
    url: originalRequest.url,
    method: originalRequest.method,
    code: error.response?.data?.code,
    error: error.response?.data?.error,
    retry: Boolean(originalRequest._retry),
  });

  if (originalRequest.url?.includes('/api/auth/refresh')) {
    await handleAuthFailure({ source: 'refresh_endpoint', response: error.response?.data });
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
      if (!newAT) {
        const failure = getLastRefreshFailure();
        const refreshError = new Error(
          `Refresh failed: ${failure?.message || 'no replacement access token was returned'}`,
        );
        (refreshError as any).refreshFailure = failure;
        throw refreshError;
      }

      processQueue(null, newAT);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers['Authorization'] = 'Bearer ' + newAT;
      return api(originalRequest);
    } catch (refreshError: any) {
      processQueue(refreshError, null);
      const failure = (refreshError as any)?.refreshFailure || getLastRefreshFailure();
      if (failure?.kind === 'network') {
        console.warn('[AUTH] Keeping session after transient refresh failure', failure);
        return Promise.reject(refreshError);
      }
      await handleAuthFailure({
        source: 'access_token_refresh',
        request: originalRequest.url,
        error: refreshError?.message || refreshError,
      }, requestToken ?? undefined);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }

  return Promise.reject(error);
});
