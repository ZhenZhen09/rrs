import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');

      if (storedToken && userData) {
        if (isTokenExpired(storedToken)) {
          console.log('Stored token expired, clearing session');
          await logout();
        } else {
          try {
            // Requirement: check role from AsyncStorage or /api/auth/me
            let parsedUser = JSON.parse(userData);
            
            // Try to verify session with server if possible
            try {
              const response = await api.get('/api/auth/me');
              const remoteUser = response.data.user || response.data;
              if (remoteUser && remoteUser.role) {
                parsedUser = remoteUser;
                await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
              }
            } catch (apiError) {
              // If /api/auth/me fails (e.g. doesn't exist or network error), 
              // we continue with stored data but still enforce role check
              console.log('Session verification with server failed, using stored data');
            }

            if (parsedUser.role !== 'admin') {
              console.warn('Non-admin user access detected, logging out');
              await logout();
              return;
            }

            setUser(parsedUser);
            setToken(storedToken);
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
            await logout();
          }
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
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

      await AsyncStorage.setItem('authToken', newToken);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
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
    login,
    logout
  }), [user, token, isAuthenticated, isLoading, login, logout]);

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
