import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

const errandsWordmark = require('../../assets/images/errands-rider-wordmark.png');
const SLOW_LOAD_MESSAGE_DELAY_MS = 900;
const FADE_IN_MS = 180;
const FADE_OUT_MS = 160;

type DashboardTransitionOverlayProps = {
  visible: boolean;
  error?: unknown | null;
  onRetry: () => void;
};

export function DashboardTransitionOverlay({ visible, error, onRetry }: DashboardTransitionOverlayProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [showPreparingMessage, setShowPreparingMessage] = useState(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? FADE_IN_MS : FADE_OUT_MS,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  useEffect(() => {
    if (!visible || error) {
      setTimeout(() => setShowPreparingMessage(false), 0);
      return;
    }

    const slowLoadTimer = setTimeout(() => setShowPreparingMessage(true), SLOW_LOAD_MESSAGE_DELAY_MS);
    return () => {
      clearTimeout(slowLoadTimer);
    };
  }, [error, visible]);

  return (
    <Animated.View
      testID="dashboard_transition_overlay"
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      style={[styles.overlay, { opacity }]}
    >
      <Image
        testID="dashboard_transition_logo"
        source={errandsWordmark}
        resizeMode="contain"
        accessibilityLabel="ERRANDS"
        style={styles.logo}
      />
      {error ? (
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Couldn’t load your tasks</Text>
          <Text style={styles.errorMessage}>Check your connection and try again.</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ActivityIndicator testID="dashboard_transition_spinner" color="#702CF6" size="small" style={styles.spinner} />
          {visible && showPreparingMessage ? <Text style={styles.preparingMessage}>Preparing your tasks…</Text> : null}
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  logo: { width: 220, height: 92 },
  spinner: { marginTop: 24 },
  preparingMessage: { marginTop: 16, color: '#475569', fontSize: 15, fontWeight: '500' },
  errorContent: { alignItems: 'center', paddingHorizontal: 32, marginTop: 28 },
  errorTitle: { color: '#172B4D', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  errorMessage: { color: '#52627A', fontSize: 14, textAlign: 'center', marginTop: 8 },
  retryButton: {
    minWidth: 120,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 24,
    backgroundColor: '#702CF6',
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
