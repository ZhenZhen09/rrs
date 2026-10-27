import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const readSecure = (key: string) => SecureStore.getItemAsync(key);
const writeSecure = (key: string, value: string) => SecureStore.setItemAsync(key, value);

export const getAccessToken = async () => {
  const secureToken = await readSecure(ACCESS_TOKEN_KEY);
  if (secureToken) return secureToken;

  // One-time migration for existing sessions created before SecureStore was used.
  const legacyToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (legacyToken) {
    await writeSecure(ACCESS_TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  return legacyToken;
};

export const getRefreshToken = async () => {
  const secureToken = await readSecure(REFRESH_TOKEN_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (legacyToken) {
    await writeSecure(REFRESH_TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  return legacyToken;
};

export const saveTokens = async (accessToken: string, refreshToken?: string | null) => {
  await writeSecure(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await writeSecure(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
};

export const clearTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
  ]);
};
