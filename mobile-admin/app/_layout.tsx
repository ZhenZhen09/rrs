import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Bugsnag from '@bugsnag/expo';
import BugsnagPerformance from '@bugsnag/expo-performance';
import { AuthProvider } from '../context/AuthContext';
import { RealTimeProvider } from '../context/RealTimeContext';

type BugsnagGlobals = typeof globalThis & {
  __rrsMobileAdminBugsnagStarted?: boolean;
  __rrsMobileAdminBugsnagPerformanceStarted?: boolean;
};

const bugsnagGlobals = globalThis as BugsnagGlobals;

if (!bugsnagGlobals.__rrsMobileAdminBugsnagStarted) {
  Bugsnag.start();
  bugsnagGlobals.__rrsMobileAdminBugsnagStarted = true;
}

if (!bugsnagGlobals.__rrsMobileAdminBugsnagPerformanceStarted) {
  BugsnagPerformance.start();
  bugsnagGlobals.__rrsMobileAdminBugsnagPerformanceStarted = true;
}

const BugsnagErrorBoundary =
  Bugsnag.getPlugin('react')?.createErrorBoundary(React) ?? React.Fragment;

function RootLayout() {
  return (
    <BugsnagErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <RealTimeProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </RealTimeProvider>
        </AuthProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </BugsnagErrorBoundary>
  );
}

export default BugsnagPerformance.withInstrumentedAppStarts(RootLayout);
