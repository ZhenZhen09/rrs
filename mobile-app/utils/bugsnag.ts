import Bugsnag from '@bugsnag/expo';
import BugsnagPerformance from '@bugsnag/expo-performance';
import React from 'react';

type BugsnagGlobals = typeof globalThis & {
  __rrsBugsnagStarted?: boolean;
  __rrsBugsnagPerformanceStarted?: boolean;
};

const bugsnagGlobals = globalThis as BugsnagGlobals;

if (!bugsnagGlobals.__rrsBugsnagStarted) {
  Bugsnag.start();
  bugsnagGlobals.__rrsBugsnagStarted = true;
}

if (!bugsnagGlobals.__rrsBugsnagPerformanceStarted) {
  BugsnagPerformance.start();
  bugsnagGlobals.__rrsBugsnagPerformanceStarted = true;
}

export const BugsnagErrorBoundary =
  Bugsnag.getPlugin('react')?.createErrorBoundary(React) ?? React.Fragment;
