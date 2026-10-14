import React from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMessaging } from '@/hooks/useMessaging';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageComposer } from '@/components/messaging/MessageComposer';
import { getMessagingKeyboardBehavior } from '@/utils/keyboardLayout';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedConversation, messages, messagesLoading, messagesError, sendError, sendRetryAfterSeconds, refreshMessages, send, retry, hasOlderMessages, loadingOlderMessages, loadOlderMessagesError, loadOlderMessages } = useMessaging(id);
  const title = selectedConversation?.rider?.name || 'Conversation';
  const keyboard = getMessagingKeyboardBehavior(Platform.OS);
  const reduceMotion = useReducedMotionPreference();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardFrame} behavior={keyboard.behavior} keyboardVerticalOffset={keyboard.offset}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <View style={styles.header}><TouchableOpacity accessibilityLabel="Back to inbox" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={24} color="#0F172A" /></TouchableOpacity><View style={styles.headerCopy}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.subtitle} numberOfLines={1}>{selectedConversation?.request?.id ? `Request #${selectedConversation.request.id}` : 'Delivery conversation'}</Text></View><View style={styles.status}><View style={[styles.dot, { backgroundColor: selectedConversation?.status === 'closed' ? '#94A3B8' : '#10B981' }]} /><Text style={styles.statusText}>{selectedConversation?.status === 'closed' ? 'Closed' : 'Open'}</Text></View></View>
      {messagesLoading && messages.length === 0 ? <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.muted}>Loading messages…</Text></View> : messagesError ? <View style={styles.center}><Text style={styles.error}>{messagesError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void refreshMessages()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : <FlatList data={messages} keyExtractor={item => `${item.sender.id}:${item.clientMessageId}`} inverted onEndReached={() => { if (hasOlderMessages && !loadingOlderMessages && !loadOlderMessagesError) void loadOlderMessages(); }} onEndReachedThreshold={0.4} renderItem={({ item }) => <MessageBubble message={item} own={item.sender?.role === 'rider'} status={item.localStatus} animate={item.animateEntry} reduceMotion={reduceMotion} onRetry={sendRetryAfterSeconds > 0 ? undefined : () => void retry(item)} />} contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messages} ListFooterComponent={hasOlderMessages || loadOlderMessagesError ? <View style={styles.olderMessagesFooter}>{loadingOlderMessages ? <ActivityIndicator size="small" color="#2563EB" /> : <TouchableOpacity accessibilityRole="button" onPress={() => void loadOlderMessages()} style={styles.loadOlderButton}><Text style={styles.loadOlderText}>{loadOlderMessagesError ? 'Retry loading older messages' : 'Load older messages'}</Text></TouchableOpacity>}{loadOlderMessagesError ? <Text accessibilityRole="alert" style={styles.error}>{loadOlderMessagesError}</Text> : null}</View> : null} ListEmptyComponent={<View style={styles.center}><MaterialIcons name="chat-bubble-outline" size={44} color="#CBD5E1" /><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.muted}>Send a message to dispatch about this delivery.</Text></View>} />}
      {sendError && <Text accessibilityRole="alert" style={styles.sendError}>{sendError}</Text>}
      <MessageComposer reduceMotion={reduceMotion} disabled={selectedConversation?.status === 'closed' || sendRetryAfterSeconds > 0} onSend={async body => Boolean(await send(body))} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  keyboardFrame: { flex: 1 },
  header: { minHeight: 76, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0, marginHorizontal: 4 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  messages: { paddingVertical: 14 },
  olderMessagesFooter: { alignItems: 'center', padding: 14, gap: 8 },
  loadOlderButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  loadOlderText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  muted: { color: '#64748B', textAlign: 'center', fontSize: 15 },
  error: { color: '#B91C1C', textAlign: 'center', fontSize: 15 },
  sendError: { color: '#B91C1C', textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FEF2F2' },
  retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#2563EB', justifyContent: 'center' },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyTitle: { color: '#334155', fontSize: 18, fontWeight: '700' },
});
