import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, wakeUpServer } from '@/utils/api';
import { useRouter, useSegments } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_FETCH_TASK = 'BACKGROUND_SERVER_WAKEUP';

// Priority 2: Define the background task to keep server awake
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[BackgroundFetch] Heartbeat triggered to keep Render awake...');
    await wakeUpServer();
    return TaskManager.TaskResult.NewData;
  } catch (error) {
    return TaskManager.TaskResult.Failed;
  }
});

type User = {
  id: string;
  email: string;
  role: 'rider' | 'personnel';
  name?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isServerReady: boolean;
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
    return {
      user: null,
      isLoading: true,
      isServerReady: false,
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
    
    // Priority 1: Optimistic Navigation
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && (inAuthGroup || segments[0] === undefined)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);

  useProtectedRoute(user, isLoading);

  // Priority 2: Background Heartbeat & Server Readiness
  useEffect(() => {
    const handleWakeup = async () => {
      await wakeUpServer();
      setIsServerReady(true);
    };
    handleWakeup();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        wakeUpServer(); // Re-ping when app comes to foreground
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          // Priority 1: Instant load from cache
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Session error', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Increase timeout for login specifically
      const response = await api.post('/api/auth/login', { email, password }, { timeout: 60000 });
      const data = response.data;

      if (data.require_password_reset) {
        return { success: false, requirePasswordReset: true, userId: data.userId };
      }

      const token = data.id || 'rider-session-token'; 
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      
      setUser(data);
      return { success: true };
    } catch (error: any) {
      let errorMessage = error.response?.data?.error || "Network Error: Could not connect to server.";
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      setUser(null);
    } catch (e) {
      setUser(null);
    }
  };

  const contextValue = React.useMemo(() => ({
    user,
    isLoading,
    isServerReady,
    login,
    logout
  }), [user, isLoading, isServerReady]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
