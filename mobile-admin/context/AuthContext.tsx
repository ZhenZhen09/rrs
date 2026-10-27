import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { clearTokens, getAccessToken, saveTokens } from '../services/tokenStorage';
import { refreshAccessToken } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: (shouldUpdateState?: () => boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    // In React Native, we use global.atob or a polyfill. 
    // Since we already have base-64 installed for TrackingMap, we can use it here too.
    const { decode: base64Decode } = require('base-64');
    return JSON.parse(base64Decode(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // Check with 30s buffer
  return payload.exp * 1000 < Date.now() + 30000;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  const setBiometricEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('biometricEnabled', JSON.stringify(enabled));
      setBiometricEnabledState(enabled);
    } catch (error) {
      console.error('Failed to save biometric setting:', error);
    }
  };

  const logout = useCallback(async (shouldUpdateState: () => boolean = () => true) => {
    try {
      await clearTokens();
      await AsyncStorage.removeItem('user');
      if (!shouldUpdateState()) return;
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  const loadStoredAuth = async (shouldUpdateState: () => boolean) => {
    try {
      let storedToken = await getAccessToken();
      const userData = await AsyncStorage.getItem('user');
      const bioSetting = await AsyncStorage.getItem('biometricEnabled');
      if (!shouldUpdateState()) return;

      if (bioSetting !== null) {
        setBiometricEnabledState(JSON.parse(bioSetting));
      }

      if (storedToken && isTokenExpired(storedToken)) {
        try {
          storedToken = await refreshAccessToken();
        } catch {
          storedToken = null;
        }
      } else if (!storedToken) {
        try {
          storedToken = await refreshAccessToken();
        } catch {
          storedToken = null;
        }
      }

      if (storedToken && userData) {
          try {
            // Requirement: check role from AsyncStorage or /api/auth/me
            let parsedUser = JSON.parse(userData);
            
            // Try to verify session with server if possible
            try {
              const response = await api.get('/auth/me');
              if (!shouldUpdateState()) return;
              const remoteUser = response.data.user || response.data;
              if (remoteUser && remoteUser.role) {
                parsedUser = remoteUser;
                await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
              }
            } catch (apiError) {
              if (!shouldUpdateState()) return;
              // If /api/auth/me fails (e.g. doesn't exist or network error), 
              // we continue with stored data but still enforce role check
              console.log('Session verification with server failed, using stored data');
            }

            if (parsedUser.role !== 'admin') {
              console.warn('Non-admin user access detected, logging out');
              await logout(shouldUpdateState);
              return;
            }

            if (shouldUpdateState()) {
              setUser(parsedUser);
              setToken(storedToken);
            }
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
            await logout(shouldUpdateState);
          }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      if (shouldUpdateState()) setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    loadStoredAuth(isActive);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && active) {
        loadStoredAuth(isActive);
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
       const response = await api.post('/auth/login', { email, password });
      
      // Requirement: inspect response.data.user.role
      // Handle both { user: { role } } and { role } structures
      const userData = response.data.user || response.data;
      
      if (userData.role !== 'admin') {
        return { 
          success: false, 
          error: 'Access Denied: This application is restricted to administrators only.' 
        };
      }

      const { token: newToken, refreshToken, ...userProfile } = response.data;
      // If server returned a nested user object, ensure userProfile reflects that
      const finalProfile = response.data.user || userProfile;

      await saveTokens(newToken, refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(finalProfile));

      setToken(newToken);
      setUser(finalProfile);
      return { success: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please check your credentials.' 
      };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    biometricEnabled,
    login,
    logout,
    setBiometricEnabled
  }), [user, token, isAuthenticated, isLoading, biometricEnabled, login, logout, setBiometricEnabled]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
