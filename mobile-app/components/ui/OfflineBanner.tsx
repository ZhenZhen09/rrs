import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnection } from '@/context/ConnectionContext';

export const OfflineBanner = () => {
  const insets = useSafeAreaInsets();
  const { state, retry } = useConnection();
  const [slideAnim] = useState(() => new Animated.Value(-100));

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: state === 'no_network' || state === 'service_unavailable' ? 0 : -130,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, state]);

  const title = state === 'no_network' ? 'No Internet Connection' : 'Cannot reach Errands';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          paddingTop: insets.top,
          minHeight: 106 + insets.top,
        },
      ]}
    >
      <View style={styles.banner} accessibilityLiveRegion="polite">
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>New assignments and important updates may be delayed.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#FF3B30',
  },
  banner: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copy: { flex: 1, paddingRight: 12 },
  title: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  text: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  retry: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF' },
  retryText: { color: '#B42318', fontWeight: '800', fontSize: 12 },
});
