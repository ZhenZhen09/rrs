import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ConversationRow } from '@/components/messaging/ConversationRow';
import { NotificationModal } from '@/components/NotificationModal';
import { ShiftControlDrawer } from '@/components/ShiftControlDrawer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDashboard } from '@/hooks/data/useDashboard';
import { useMessaging } from '@/hooks/useMessaging';
import { RiderSurfaceGradient } from '@/components/RiderSurfaceGradient';

export default function InboxScreen() {
  const router = useRouter();
  const { conversations, loading, error, refreshInbox, hasMoreConversations, loadingMoreConversations, loadMoreConversationsError, loadMoreConversations } = useMessaging();
  const {
    user,
    tasks,
    notifications,
    unreadCount,
    isNotifOpen,
    setIsNotifOpen,
    handleLogout,
    handleNotificationClick,
    handleMarkAllRead,
  } = useDashboard();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RiderSurfaceGradient />
      <ScreenHeader
        variant="hero"
        title="Inbox"
        subtitle="Messages about your deliveries"
        onNotifPress={() => setIsNotifOpen(true)}
        onSettingsPress={() => router.push('/settings')}
        onLogoutPress={handleLogout}
        profileName={user?.name}
        profileAvatarId={user?.avatar_id ?? user?.avatarId}
        unreadCount={unreadCount}
      />
      <ShiftControlDrawer tasks={tasks} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.muted}>Loading conversations…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="cloud-off" size={44} color="#94A3B8" />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => void refreshInbox({ force: true })} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ConversationRow conversation={item} onPress={() => router.push(`/conversation/${item.id}` as never)} />}
          onEndReached={() => { if (hasMoreConversations && !loadingMoreConversations && !loadMoreConversationsError) void loadMoreConversations(); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={hasMoreConversations || loadMoreConversationsError ? (
            <View style={styles.listFooter}>
              {loadingMoreConversations ? <ActivityIndicator size="small" color="#2563EB" /> : (
                <TouchableOpacity accessibilityRole="button" onPress={() => void loadMoreConversations()} style={styles.loadMore}>
                  <Text style={styles.loadMoreText}>{loadMoreConversationsError ? 'Retry loading older conversations' : 'Load older conversations'}</Text>
                </TouchableOpacity>
              )}
              {loadMoreConversationsError ? <Text accessibilityRole="alert" style={styles.error}>{loadMoreConversationsError}</Text> : null}
            </View>
          ) : null}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refreshInbox({ force: true })} colors={['#2563EB']} />}
          contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={(
            <View style={styles.center}>
              <MaterialIcons name="forum" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.muted}>Delivery messages from dispatch will appear here.</Text>
            </View>
          )}
        />
      )}
      <NotificationModal
        visible={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  muted: { color: '#64748B', textAlign: 'center', fontSize: 15 },
  error: { color: '#B91C1C', textAlign: 'center', fontSize: 15 },
  retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#2563EB', justifyContent: 'center' },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyList: { flexGrow: 1 },
  emptyTitle: { color: '#334155', fontSize: 18, fontWeight: '700' },
  listFooter: { alignItems: 'center', padding: 16, gap: 8 },
  loadMore: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  loadMoreText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
});
