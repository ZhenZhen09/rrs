import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function RiderSurfaceGradient() {
  return (
    <LinearGradient
      testID="rider-surface-gradient"
      pointerEvents="none"
      colors={['rgba(255, 255, 255, 0)', 'rgba(241, 245, 250, 0.55)']}
      locations={[0, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}
