import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { BugsnagFallback } from '@/components/ui/BugsnagFallback';
import { BugsnagErrorBoundary } from '@/utils/bugsnag';
import { queryClient } from '@/utils/queryClient';
import { wakeUpServer } from '@/utils/api';
import { initSyncManager, stopSyncManager } from '@/services/SyncManager';
import { RadarBriefing } from '@/components/TacticalBriefing/RadarBriefing';
import { useDashboard } from '@/hooks/data/useDashboard';
import { getRiderTaskTab } from '@/utils/taskFilters';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { syncActiveDeliveryNotifications } from '@/services/deliveryNotifications';
import { DashboardTransitionOverlay } from '@/components/ui/DashboardTransitionOverlay';
import { getDashboardTransitionState } from '@/utils/dashboardTransition';


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors here, we can safe ignore it */
});

export const unstable_settings = {
  anchor: '(tabs)',
};

const BRIEFING_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function RootLayoutNav({ onLoaded }: { onLoaded: () => void }) {
  const { isLoading, isAuthenticating, user } = useAuth();
  const segments = useSegments();
  usePushNotifications(user?.id);
  const { tasks, tasksLoading, tasksFetching, tasksError, retryTasks } = useDashboard();
  const [showBriefing, setShowBriefing] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void syncActiveDeliveryNotifications(tasks).catch((error) => console.warn('Unable to sync active delivery notification:', error));
  }, [tasks]);

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
  const transition = getDashboardTransitionState({
    isAuthenticating,
    hasUser: Boolean(user),
    loginRouteActive: segments[0] === 'login',
    tasksLoading,
    tasksFetching,
    tasksError,
  });
  
  // Get the very first task in the optimized sequence
  const nextTask = [...overdueTasks, ...todayTasks].sort((a, b) => (a.queue_order || 999) - (b.queue_order || 999))[0] || null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="conversation/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>

      <DashboardTransitionOverlay
        visible={transition.visible}
        error={transition.error}
        onRetry={() => { void retryTasks(); }}
      />

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

let App: any = RootLayout;
if (Platform.OS !== 'web') {
  // Keep this native-only module out of the web bundle and web runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BugsnagPerformance = require('@bugsnag/expo-performance').default;
  App = BugsnagPerformance.withInstrumentedAppStarts(RootLayout);
}

export default App;
