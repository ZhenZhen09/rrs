import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthFailureListener, resetAuthStatus } from '@/utils/api';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';

import { AuthManager } from '@/utils/AuthManager';
import { queryClient } from '@/utils/queryClient';
import { getTasks } from '@/services/apiService';
import { getAuthRedirect } from '@/utils/authNavigation';
import { unregisterFcmToken } from '@/services/pushTokenService';

type AuthContextType = {
  user: (Record<string, any> & { avatar_id?: string | null; avatarId?: string | null }) | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  login: (email: string, password: string, keepSignedIn: boolean) => Promise<{
    success: boolean; 
    requirePasswordReset?: boolean; 
    userId?: string; 
    error?: string; 
  }>;
  logout: () => Promise<void>;
  updateAvatar: (avatarId: string) => Promise<void>;
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    const redirect = getAuthRedirect({
      isLoading,
      user,
      firstSegment: segments[0],
      navigationReady: Boolean(navigationState?.key),
    });
    if (redirect) router.replace(redirect);
  }, [user, isLoading, navigationState?.key, router, segments]);

  useEffect(() => {
    // Listen for global auth failures (401s)
    setAuthFailureListener(() => {
      console.warn('[AUTH] Global interceptor triggered logout');
      setToken(null);
      setUser(null);
    });

    const check = async () => {
      try {
        const shouldRestoreSession = await AuthManager.shouldRestoreSession();
        if (!shouldRestoreSession) {
          await AuthManager.clearSession();
          setToken(null);
          setUser(null);
          return;
        }

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

  const login = async (email: string, password: string, keepSignedIn: boolean) => {
    setIsAuthenticating(true);
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
        await AuthManager.saveSession(data.token, data.refreshToken, data, keepSignedIn);
        resetAuthStatus();

        if (data.id) {
          try {
            await queryClient.fetchQuery({
              queryKey: ['tasks', data.id],
              queryFn: getTasks,
              staleTime: 0,
            });
          } catch {
            // Keep the login session and let the dashboard show its retry state.
          }
        }

        const currentToken = await AuthManager.getAccessToken();
        if (!currentToken) return { success: false, error: 'Your session expired. Please sign in again.' };

        setToken(currentToken);
        setUser(data);
        return { success: true };
      }
      return { success: false, error: 'No token' };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Fail' };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      await unregisterFcmToken();
    } catch {
      // Logout must still complete when the device is offline.
    }
    try {
      await api.post('/api/auth/logout', { userId: user?.id });
    } catch (e) {}
    await AuthManager.clearSession();

    // --- PRIVACY SYNC: Clear duty status ---
    await AsyncStorage.setItem('@is_on_duty', 'false');

    await AsyncStorage.multiRemove(['@rider_id', '@active_request_id']);
    resetAuthStatus();
    setToken(null);
    setUser(null);
  };

  const updateAvatar = async (avatarId: string): Promise<void> => {
    if (!user) throw new Error('A rider profile is required');
    const response = await api.patch('/api/users/me/avatar', { avatar_id: avatarId });
    const confirmedAvatarId = response.data?.avatar_id;
    if (confirmedAvatarId !== avatarId) throw new Error('The avatar update was not confirmed');
    const updatedUser = { ...user, avatar_id: confirmedAvatarId, avatarId: confirmedAvatarId };
    await AuthManager.saveUserData(updatedUser);
    setUser(updatedUser);
  };

  const value = useMemo(() => ({ user, token, isLoading, isAuthenticating, login, logout, updateAvatar }), [user, token, isLoading, isAuthenticating]);
  return <AuthContext.Provider value={value as any}>{children}</AuthContext.Provider>;
}
