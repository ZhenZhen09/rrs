import Bugsnag from '@bugsnag/expo';
import BugsnagPerformance from '@bugsnag/expo-performance';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BugsnagFallback } from '@/components/ui/BugsnagFallback';
import { wakeUpServer } from '@/utils/api';

Bugsnag.start();
BugsnagPerformance.start();

const ErrorBoundary = Bugsnag.getPlugin('react').createErrorBoundary(React);

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
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

  // Wake up the Render server as soon as the app boots
  useEffect(() => {
    wakeUpServer();
  }, []);

  return (
    <ErrorBoundary FallbackComponent={BugsnagFallback}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthProvider>
              <OfflineBanner />
              <RootLayoutNav />
            </AuthProvider>
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
