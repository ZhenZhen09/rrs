import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ 
    success: boolean; 
    requirePasswordReset?: boolean; 
    userId?: string; 
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
    const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (storedUser) {
      // Migrate to localStorage for cross-tab support if it was in sessionStorage
      localStorage.setItem('currentUser', storedUser);
      return JSON.parse(storedUser);
    }
    return null;
  });

  const login = async (email: string, password: string): Promise<{ success: boolean; requirePasswordReset?: boolean; userId?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.status === 428) {
        // Handle cPanel Technical Domain interception
        alert("Security checkpoint required. The page will now reload so you can accept the warning.");
        // Unregister service workers so the reload actually hits the network
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
        }
        window.location.reload();
        return { success: false };
      }
      
      const data = await response.json();

      if (response.ok) {
        if (data.require_password_reset) {
          return { success: false, requirePasswordReset: true, userId: data.userId };
        }
        if (data.mfa_required) {
          return { success: false, mfa_required: true, userId: data.userId };
        }
        if (data.mfa_setup_required) {
          return { success: false, mfa_setup_required: true, userId: data.userId };
        }
        setUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        sessionStorage.setItem('currentUser', JSON.stringify(data));
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
  };

  const createAccount = async (email: string, password: string, role: 'personnel' | 'rider'): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      if (response.ok) {
        const newUser = await response.json();
        setUser(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        sessionStorage.setItem('currentUser', JSON.stringify(newUser));
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
