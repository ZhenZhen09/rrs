import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function MessageComposer({ onSend, disabled, reduceMotion = true }: { onSend: (body: string) => Promise<boolean | void>; disabled?: boolean; reduceMotion?: boolean }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const mounted = useRef(true);
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; scale.stopAnimation(); }; }, [scale]);
  const pressFeedback = (pressed: boolean) => {
    if (reduceMotion) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: pressed ? 0.92 : 1, speed: 32, bounciness: 4, useNativeDriver: true }).start();
  };
  const submit = async () => {
    const value = body.trim();
    if (!value || sendLock.current || disabled) return;
    sendLock.current = true;
    setSending(true);
    try {
      const accepted = await onSend(value);
      if (mounted.current && accepted !== false) setBody('');
    } finally {
      sendLock.current = false;
      if (mounted.current) setSending(false);
    }
  };
  return (
    <View>
      <View style={styles.container}>
        <TextInput accessibilityLabel="Message" value={body} onChangeText={setBody} placeholder="Write a message…" placeholderTextColor="#94A3B8" multiline maxLength={2000} style={styles.input} editable={!disabled && !sending} onSubmitEditing={submit} blurOnSubmit={false} />
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity accessibilityLabel="Send message" accessibilityRole="button" accessibilityState={{ disabled: !body.trim() || sending || disabled, busy: sending }} disabled={!body.trim() || sending || disabled} onPress={submit} onPressIn={() => pressFeedback(true)} onPressOut={() => pressFeedback(false)} style={[styles.send, (!body.trim() || sending || disabled) && styles.disabled]}>
            {sending && !reduceMotion ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name={sending ? 'hourglass-empty' : 'send'} size={22} color="#FFF" />}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, backgroundColor: '#F1F5F9', color: '#0F172A', paddingHorizontal: 16, paddingVertical: 11, fontSize: 16 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' },
  disabled: { backgroundColor: '#94A3B8' },
});
