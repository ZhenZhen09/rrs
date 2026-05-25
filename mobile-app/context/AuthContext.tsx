import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthFailureListener, resetAuthStatus } from '@/utils/api';
import { useRouter, useSegments } from 'expo-router';

import { AuthManager } from '@/utils/AuthManager';

type AuthContextType = {
  user: any;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ 
    success: boolean; 
    requirePasswordReset?: boolean; 
    userId?: string; 
    error?: string; 
  }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === 'login';
    if (!user && !inAuthGroup) router.replace('/login');
    else if (user && inAuthGroup) router.replace('/(tabs)');
  }, [user, isLoading, segments]);

  useEffect(() => {
    // Listen for global auth failures (401s)
    setAuthFailureListener(() => {
      console.warn('[AUTH] Global interceptor triggered logout');
      setToken(null);
      setUser(null);
    });

    const check = async () => {
      try {
        const userData = await AuthManager.getUserData();
        const token = await AuthManager.getValidToken();
        
        if (token && userData) {
          resetAuthStatus();
          setToken(token);
          setUser(userData);
        } else {
          await AuthManager.clearSession();
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const data = res.data;

      // Handle password reset requirement
      if (data.require_password_reset) {
        return { 
          success: false, 
          requirePasswordReset: true, 
          userId: data.id || data.userId 
        };
      }

      if (data.token && data.refreshToken) {
        await AuthManager.saveSession(data.token, data.refreshToken, data);
        resetAuthStatus();
        setToken(data.token);
        setUser(data);
        return { success: true };
      }
      return { success: false, error: 'No token' };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Fail' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', { userId: user?.id });
    } catch (e) {}
    await AuthManager.clearSession();
    await AsyncStorage.multiRemove(['@rider_id', '@active_request_id']);
    resetAuthStatus();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, token, isLoading, login, logout }), [user, token, isLoading]);
  return <AuthContext.Provider value={value as any}>{children}</AuthContext.Provider>;
}
