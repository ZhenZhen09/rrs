import Bugsnag from '@bugsnag/expo';
import BugsnagPerformance from '@bugsnag/expo-performance';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { BugsnagFallback } from '@/components/ui/BugsnagFallback';
import { wakeUpServer } from '@/utils/api';
import { AnimatedSplashScreen } from '@/components/ui/AnimatedSplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors here, we can safe ignore it */
});

Bugsnag.start();
BugsnagPerformance.start();

const ErrorBoundary = Bugsnag.getPlugin('react').createErrorBoundary(React);

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav({ onLoaded }: { onLoaded: () => void }) {
  const { isLoading } = useAuth();
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    if (!isLoading && animationFinished) {
      onLoaded();
    }
  }, [isLoading, animationFinished]);

  if (isLoading || !animationFinished) {
    return (
      <AnimatedSplashScreen onAnimationComplete={() => setAnimationFinished(true)} />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" options={{ title: 'Booking Details', headerBackTitle: 'Back', headerShown: true }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
    </Stack>
  );
}

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/utils/queryClient';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  // Wake up the Render server as soon as the app boots
  useEffect(() => {
    wakeUpServer();
  }, []);

  const handleLoaded = () => {
    setIsReady(true);
    SplashScreen.hideAsync();
  };

  return (
    <ErrorBoundary FallbackComponent={BugsnagFallback}>
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
    </ErrorBoundary>
  );
}
