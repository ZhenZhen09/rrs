import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConversationSummary } from '@/types/messaging';
import { useLocation } from '@/context/LocationContext';

export function ConversationRow({ conversation, onPress }: { conversation: ConversationSummary; onPress: () => void }) {
  const { isSocketConnected } = useLocation();
  const title = conversation.rider.name || 'Delivery conversation';
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.row} activeOpacity={0.7}>
      <View style={styles.avatar}><MaterialIcons name="support-agent" size={24} color="#2563EB" /></View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.nameWrap}>
            <Text style={[styles.title, conversation.unreadCount > 0 && styles.unread]} numberOfLines={1}>{title}</Text>
            <View style={[styles.presenceDot, isSocketConnected ? styles.onlineDot : styles.offlineDot]} accessibilityLabel={isSocketConnected ? 'Online' : 'Offline'} />
          </View>
          <Text style={styles.date}>{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : ''}</Text>
        </View>
        <Text style={[styles.presenceLabel, isSocketConnected ? styles.onlineText : styles.offlineText]}>{isSocketConnected ? 'Online' : 'Offline'}</Text>
        <Text style={[styles.preview, conversation.unreadCount > 0 && styles.unread]} numberOfLines={2}>
          {conversation.lastMessage?.body || 'No messages yet'}
        </Text>
      </View>
      {conversation.unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</Text></View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  presenceDot: { width: 8, height: 8, borderRadius: 4 },
  onlineDot: { backgroundColor: '#10B981' },
  offlineDot: { backgroundColor: '#CBD5E1' },
  presenceLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  onlineText: { color: '#059669' },
  offlineText: { color: '#94A3B8' },
  unread: { fontWeight: '800' },
  date: { color: '#64748B', fontSize: 12 },
  preview: { color: '#64748B', fontSize: 14, marginTop: 4 },
  badge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});
