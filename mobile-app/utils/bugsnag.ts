import React from 'react';
import { Platform } from 'react-native';

type BugsnagGlobals = typeof globalThis & {
  __rrsBugsnagStarted?: boolean;
  __rrsBugsnagPerformanceStarted?: boolean;
};

type BugsnagErrorBoundaryProps = {
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<any>;
};

const bugsnagGlobals = globalThis as BugsnagGlobals;
let NativeBugsnagErrorBoundary: any;

if (Platform.OS !== 'web') {
  const Bugsnag = require('@bugsnag/expo').default;
  const BugsnagPerformance = require('@bugsnag/expo-performance').default;

  if (!bugsnagGlobals.__rrsBugsnagStarted) {
    Bugsnag.start();
    bugsnagGlobals.__rrsBugsnagStarted = true;
  }

  if (!bugsnagGlobals.__rrsBugsnagPerformanceStarted) {
    BugsnagPerformance.start();
    bugsnagGlobals.__rrsBugsnagPerformanceStarted = true;
  }

  NativeBugsnagErrorBoundary = Bugsnag.getPlugin('react')?.createErrorBoundary(React);
}

export function BugsnagErrorBoundary({
  children,
  FallbackComponent,
}: BugsnagErrorBoundaryProps) {
  if (Platform.OS === 'web' || !NativeBugsnagErrorBoundary) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(
    NativeBugsnagErrorBoundary,
    { FallbackComponent },
    children,
  );
}
