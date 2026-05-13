import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { AnimatedSplashScreen } from '@/components/ui/AnimatedSplashScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { BugsnagFallback } from '@/components/ui/BugsnagFallback';
import { queryClient } from '@/utils/queryClient';
import { BugsnagErrorBoundary } from '@/utils/bugsnag';
import { wakeUpServer } from '@/utils/api';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors here, we can safe ignore it */
});

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
  }, [animationFinished, isLoading, onLoaded]);

  if (isLoading || !animationFinished) {
    return (
      <AnimatedSplashScreen onAnimationComplete={() => setAnimationFinished(true)} />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
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
