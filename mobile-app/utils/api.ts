import axios from 'axios';
import { Config } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 15000, // Reduced from 60s to 15s to fail-fast and trigger retries on 4G
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Wake up the Render server in the background.
 */
export const wakeUpServer = async () => {
  try {
    console.log('[WakeUp] Pinging server to trigger spin-up...');
    await api.get('/ping', { timeout: 30000 }); // Longer timeout only for wakeup
    console.log('[WakeUp] Server responded! Ready for action.');
  } catch (error) {
    console.log('[WakeUp] Ping sent, server warming up in background...');
  }
};

// Request Interceptor: Add Auth Token and Cache Buster
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Cache buster for GET requests
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: EXPONENTIAL BACKOFF & NETWORK RECOVERY
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response, code } = error;
    
    if (!config) return Promise.reject(error);

    // Maximum retry attempts
    const MAX_RETRIES = 3;
    config._retryCount = config._retryCount || 0;

    // Determine if we should retry (Network errors, Timeouts, or 503/504)
    const isNetworkError = !response || code === 'ECONNABORTED' || code === 'ERR_NETWORK';
    const isServerWarmingUp = response && [502, 503, 504].includes(response.status);

    if ((isNetworkError || isServerWarmingUp) && config._retryCount < MAX_RETRIES) {
      config._retryCount++;
      
      // --- EXPONENTIAL BACKOFF ---
      // 1st retry: 2s, 2nd: 4s, 3rd: 8s
      const delay = Math.pow(2, config._retryCount) * 1000;
      
      console.warn(`[API RETRY] ${config.url} (Attempt ${config._retryCount}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // If all retries fail, show a helpful alert (only for non-background tasks)
    if (config._retryCount >= MAX_RETRIES) {
       console.error(`[API FATAL] ${config.url} failed after ${MAX_RETRIES} retries.`);
    }

    return Promise.reject(error);
  }
);
