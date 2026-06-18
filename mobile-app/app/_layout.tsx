import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BugsnagPerformance from '@bugsnag/expo-performance';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { BugsnagFallback } from '@/components/ui/BugsnagFallback';
import { queryClient } from '@/utils/queryClient';
import { BugsnagErrorBoundary } from '@/utils/bugsnag';
import { wakeUpServer } from '@/utils/api';
import { initSyncManager, stopSyncManager } from '@/services/SyncManager';
import { RadarBriefing } from '@/components/TacticalBriefing/RadarBriefing';
import { useDashboard } from '@/hooks/data/useDashboard';
import { getRiderTaskTab } from '@/utils/taskFilters';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors here, we can safe ignore it */
});

export const unstable_settings = {
  anchor: '(tabs)',
};

const BRIEFING_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function RootLayoutNav({ onLoaded }: { onLoaded: () => void }) {
  const { isLoading, user } = useAuth();
  const { tasks } = useDashboard();
  const [showBriefing, setShowBriefing] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isLoading) {
      onLoaded();
    }
  }, [isLoading, onLoaded]);

  useEffect(() => {
    // Start the sync manager to handle any pending offline tasks
    initSyncManager();
    return () => stopSyncManager();
  }, []);

  // Briefing Logic
  useEffect(() => {
    const handleBriefingTrigger = async () => {
      if (!user || tasks.length === 0) return;

      const lastSeen = await AsyncStorage.getItem('last_briefing_seen');
      const now = Date.now();

      if (!lastSeen || now - parseInt(lastSeen) > BRIEFING_COOLDOWN_MS) {
        setShowBriefing(true);
        await AsyncStorage.setItem('last_briefing_seen', now.toString());
      }
    };

    // Initial check (Cold Start)
    if (!isLoading && user && tasks.length > 0) {
      handleBriefingTrigger();
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        handleBriefingTrigger();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isLoading, user, tasks.length]);

  if (isLoading) {
    return null;
  }

  const overdueTasks = tasks.filter(t => getRiderTaskTab(t) === 'overdue');
  const todayTasks = tasks.filter(t => getRiderTaskTab(t) === 'today');
  
  // Get the very first task in the optimized sequence
  const nextTask = [...overdueTasks, ...todayTasks].sort((a, b) => (a.queue_order || 999) - (b.queue_order || 999))[0] || null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>

      {showBriefing && (
        <RadarBriefing 
          overdueCount={overdueTasks.length}
          todayCount={todayTasks.length}
          nextTask={nextTask}
          onDismiss={() => setShowBriefing(false)}
        />
      )}
    </>
  );
}

function RootLayout() {
  const colorScheme = useColorScheme();

  // Wake up the Render server as soon as the app boots
  useEffect(() => {
    wakeUpServer();
  }, []);

  const handleLoaded = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BugsnagErrorBoundary FallbackComponent={BugsnagFallback}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <AuthProvider>
                <LocationProvider>
                  <OfflineBanner />
                  <RootLayoutNav onLoaded={handleLoaded} />
                </LocationProvider>
              </AuthProvider>
              <StatusBar style="auto" />
            </ThemeProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </BugsnagErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default BugsnagPerformance.withInstrumentedAppStarts(RootLayout);
