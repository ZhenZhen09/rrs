import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ConversationMessage } from '@/types/messaging';
import { getMessageTimestamp } from '@/utils/messagingRetry';

export function MessageBubble({ message, own, status, onRetry, animate = false, reduceMotion = true }: { message: ConversationMessage; own: boolean; status?: 'pending' | 'failed' | 'sent'; onRetry?: () => void; animate?: boolean; reduceMotion?: boolean }) {
  const [entry] = useState(() => new Animated.Value(1));
  const [statusOpacity] = useState(() => new Animated.Value(1));
  const entered = useRef(false);
  useEffect(() => {
    if (!animate || reduceMotion || entered.current) { entry.setValue(1); return; }
    entered.current = true;
    entry.setValue(0);
    const animation = Animated.timing(entry, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [animate, entry, reduceMotion]);
  useEffect(() => {
    if (reduceMotion) { statusOpacity.setValue(1); return; }
    statusOpacity.setValue(0);
    const animation = Animated.timing(statusOpacity, { toValue: 1, duration: 160, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, status, statusOpacity]);
  return (
    <Animated.View style={[styles.line, own && styles.ownLine, { opacity: entry, transform: [{ translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: entry.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.body, own && styles.ownBody]}>{message.body}</Text>
        <View style={styles.meta}>
          <Text style={[styles.time, own && styles.ownTime]}>{new Date(getMessageTimestamp(message.createdAt)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
          <Animated.View accessibilityLiveRegion="polite" style={{ opacity: statusOpacity }}>
            {status === 'pending' ? <Text style={styles.status}>Sending…</Text> : own && status !== 'failed' ? <MaterialIcons name="check" size={14} color="#DBEAFE" accessibilityLabel="Sent" /> : null}
          </Animated.View>
        </View>
        {status === 'failed' && <TouchableOpacity accessibilityLabel="Retry message" accessibilityRole="button" disabled={!onRetry} accessibilityState={{ disabled: !onRetry }} onPress={onRetry} style={styles.retry}><MaterialIcons name="error-outline" size={16} color="#FFE4E6" /><Text style={styles.failed}>{onRetry ? 'Not sent · Tap to retry' : 'Not sent · Retry shortly'}</Text></TouchableOpacity>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  line: { paddingHorizontal: 16, marginVertical: 4, alignItems: 'flex-start' },
  ownLine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  ownBubble: { backgroundColor: '#2563EB', borderBottomRightRadius: 5 },
  otherBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#E2E8F0' },
  body: { color: '#0F172A', fontSize: 16, lineHeight: 22 },
  ownBody: { color: '#FFF' },
  meta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4 },
  time: { color: '#64748B', fontSize: 12 },
  ownTime: { color: '#DBEAFE' },
  status: { color: '#DBEAFE', fontSize: 12 },
  retry: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
  failed: { color: '#FFE4E6', fontSize: 12, fontWeight: '700' },
});
