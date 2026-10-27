import '../global.css';
import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { RealTimeProvider } from '../context/RealTimeContext';
import { ThemeProvider } from '../context/ThemeContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

type BugsnagGlobals = typeof globalThis & {
  __rrsMobileAdminBugsnagStarted?: boolean;
  __rrsMobileAdminBugsnagPerformanceStarted?: boolean;
};

const bugsnagGlobals = globalThis as BugsnagGlobals;

let BugsnagErrorBoundary: any = React.Fragment;
let BugsnagPerformanceClient: any;

if (Platform.OS !== 'web') {
  const Bugsnag = require('@bugsnag/expo').default;
  BugsnagPerformanceClient = require('@bugsnag/expo-performance').default;

  if (!bugsnagGlobals.__rrsMobileAdminBugsnagStarted) {
    Bugsnag.start();
    bugsnagGlobals.__rrsMobileAdminBugsnagStarted = true;
  }

  if (!bugsnagGlobals.__rrsMobileAdminBugsnagPerformanceStarted) {
    BugsnagPerformanceClient.start();
    bugsnagGlobals.__rrsMobileAdminBugsnagPerformanceStarted = true;
  }

  BugsnagErrorBoundary = Bugsnag.getPlugin('react')?.createErrorBoundary(React) ?? React.Fragment;
}

function RootLayout() {
  usePushNotifications();

  return (
    <BugsnagErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <RealTimeProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="login" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </RealTimeProvider>
            </AuthProvider>
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </BugsnagErrorBoundary>
  );
}

let InstrumentedRootLayout: React.ComponentType = RootLayout;
if (typeof BugsnagPerformanceClient?.withInstrumentedAppStarts === 'function') {
  const instrumented = BugsnagPerformanceClient.withInstrumentedAppStarts(RootLayout);
  if (typeof instrumented === 'function') {
    InstrumentedRootLayout = instrumented;
  }
}

// Expo Router expects the layout route to directly export a React component.
// Wrap the instrumentation component in a named route component so the router
// always receives a valid React component as its default export.
export default function ExpoRouterLayout() {
  return <InstrumentedRootLayout />;
}
