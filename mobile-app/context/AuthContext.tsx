import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/utils/api';
import { useRouter, useSegments } from 'expo-router';
import { Alert } from 'react-native';

type User = {
  id: string;
  email: string;
  role: 'rider' | 'personnel';
  name?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ 
    success: boolean; 
    requirePasswordReset?: boolean; 
    userId?: string; 
    error?: string 
  }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('AuthContext used outside of Provider');
    return {
      user: null,
      isLoading: true,
      login: async () => ({ success: false, error: 'Auth uninitialized' }),
      logout: async () => {},
    } as any;
  }
  return context;
}

function useProtectedRoute(user: User | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('Navigation State - User:', !!user, 'Segment:', segments[0]);

    if (!user && !inAuthGroup) {
      // Not logged in, go to login
      router.replace('/login');
    } else if (user && (inAuthGroup || segments[0] === undefined)) {
      // Logged in but on login screen or root, go to dashboard
      console.log('User detected, redirecting to Dashboard...');
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); 
  const [isLoading, setIsLoading] = useState(true);

  useProtectedRoute(user, isLoading);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          console.log('Found saved session for:', JSON.parse(userData).email);
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Failed to load session or corrupted data. Clearing session.', e);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log(`Mobile app contacting server at: ${api.defaults.baseURL}`);
      const response = await api.post('/api/auth/login', { email, password });
      
      const data = response.data;

      if (data.require_password_reset) {
        return { success: false, requirePasswordReset: true, userId: data.userId };
      }

      console.log('Server login successful. Received user:', data.name);
      
      const token = data.id || 'rider-session-token'; 

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      
      setUser(data);
      return { success: true };
    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error.response) {
        errorMessage = error.response.data?.error || 'Invalid credentials';
      } else if (error.request) {
        errorMessage = "Network Error: Could not connect to server.";
      } else {
        errorMessage = error.message;
      }
      console.error('Login error detail:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Clear storage first
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      
      // Small delay to ensure storage is fully committed before state change
      // which triggers navigation redirection via useProtectedRoute
      setTimeout(() => {
        setUser(null);
        console.log('User logged out and session cleared.');
      }, 500);
    } catch (e) {
      console.error('Logout failed', e);
      setUser(null); // Force logout anyway
    }
  };

  const contextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
