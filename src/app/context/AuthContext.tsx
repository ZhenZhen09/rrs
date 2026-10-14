import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { refreshSession } from '../utils/authSession';
import { clearPersonnelV2Draft } from '../personnel-v2/draftStorage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ 
    success: boolean; 
    requirePasswordReset?: boolean; 
    challenge?: string;
    role?: string;
    error?: string;
    mfa_required?: boolean;
    mfa_setup_required?: boolean;
  }>;
  logout: () => void;
  createAccount: (email: string, password: string, role: 'personnel' | 'rider') => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = '/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('rememberedUser') || sessionStorage.getItem('sessionUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    let active = true;
    let retryDelayMs = 1000;
    let retryTimeout: number | undefined;
    const restoreSession = async () => {
      const result = await refreshSession();
      if (!active) return;
      if (result.status === 'valid') {
        retryDelayMs = 1000;
        const restoredUser = result.user as User;
        setUser(restoredUser);
        const storage = localStorage.getItem('rememberedUser') ? localStorage : sessionStorage;
        storage.setItem(storage === localStorage ? 'rememberedUser' : 'sessionUser', JSON.stringify(restoredUser));
      } else if (result.status === 'expired') {
        retryDelayMs = 1000;
        const storedUserJson = localStorage.getItem('rememberedUser') || sessionStorage.getItem('sessionUser');
        let expiredUserId: string | undefined;
        try {
          expiredUserId = storedUserJson ? (JSON.parse(storedUserJson) as User).id : undefined;
        } catch {
          expiredUserId = undefined;
        }
        clearPersonnelV2Draft(expiredUserId, localStorage);
        setUser(null);
        localStorage.removeItem('rememberedUser');
        sessionStorage.removeItem('sessionUser');
      } else {
        retryTimeout = window.setTimeout(() => { void restoreSession(); }, retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
      }
    };
    void restoreSession();
    const refreshInterval = window.setInterval(() => { void restoreSession(); }, 45 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      if (retryTimeout !== undefined) window.clearTimeout(retryTimeout);
    };
  }, []);

  const login: AuthContextType['login'] = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include'
      });
      
      const data = await response.json();

      if (response.ok) {
        if (data.require_password_reset) {
          return { 
            success: false, 
            requirePasswordReset: true, 
            challenge: data.challenge,
            role: data.role
          };
        }
        if (data.mfa_required) {
          return { success: false, mfa_required: true, challenge: data.challenge };
        }
        if (data.mfa_setup_required) {
          return { success: false, mfa_setup_required: true, challenge: data.challenge };
        }
        
        if (user?.id && user.id !== data.id) {
          clearPersonnelV2Draft(user.id, localStorage);
        }
        setUser(data);
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('sessionUser');
        localStorage.removeItem('rememberedUser');
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(rememberMe ? 'rememberedUser' : 'sessionUser', JSON.stringify(data));
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    clearPersonnelV2Draft(user?.id, localStorage);
    // Prevent a shared device from receiving the previous account's browser pushes.
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();
        if (subscription) {
          await fetch('/api/notifications/web-push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
      }
    } catch (err) {
      console.warn('Browser notification cleanup failed:', err);
    }
    try {
      await fetch(`${API_URL}/auth/logout`, { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberedUser');
    sessionStorage.removeItem('sessionUser');
  };

  const createAccount = async (email: string, password: string, role: 'personnel' | 'rider'): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
        credentials: 'include'
      });
      if (response.ok) {
        const newUser = await response.json();
        setUser(newUser);
        sessionStorage.setItem('sessionUser', JSON.stringify(newUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        createAccount,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
