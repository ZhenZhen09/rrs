import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { useRealTime } from '../../context/RealTimeContext';
import api from '../../services/api';

interface LogReply {
  id: string;
  sender: 'Admin' | 'System';
  message: string;
  time: string;
}

interface LogItem {
  id: string;
  type: 'Dispatch' | 'Auth' | 'System' | 'Request' | 'Error' | 'Admin';
  message: string;
  time: string;
  level: 'Info' | 'Success' | 'Warning' | 'Error';
  user: string;
  read: boolean;
  replies: LogReply[];
  rawRequest: any;
}

const formatTime = (timeStr: any) => {
  if (!timeStr) return 'Just now';
  const date = new Date(timeStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const buildChatHistory = (req: any, replies: LogReply[]) => {
  const history: any[] = [];
  const reqIdShort = req.request_id?.slice(-6).toUpperCase() || '---';
  
  // 1. Creation event
  history.push({
    id: 'h_created',
    sender: 'System',
    message: `New incoming pending request REQ-${reqIdShort} created by ${req.requester_name || 'Personnel'}.`,
    time: formatTime(req.created_at),
    level: 'Info',
    icon: 'clipboard-list'
  });

  // 2. Assignment event
  if (req.assigned_rider_name) {
    history.push({
      id: 'h_assigned',
      sender: 'System',
      message: `Rider ${req.assigned_rider_name} assigned to REQ-${reqIdShort}.`,
      time: formatTime(req.assigned_at || req.updated_at),
      level: 'Info',
      icon: 'user-check'
    });
  }

  // 3. Start delivery event
  if (['in_progress', 'arrived', 'completed', 'failed'].includes(req.delivery_status)) {
    history.push({
      id: 'h_started',
      sender: 'System',
      message: `Rider ${req.assigned_rider_name || 'Rider'} started transit/delivery.`,
      time: formatTime(req.updated_at),
      level: 'Info',
      icon: 'motorcycle'
    });
  }

  // 4. Terminal event (Completed / Failed / Cancelled)
  if (req.delivery_status === 'completed') {
    history.push({
      id: 'h_completed',
      sender: 'System',
      message: `Delivery marked as completed.${req.rider_remark ? ` Remarks: "${req.rider_remark}"` : ''}`,
      time: formatTime(req.completed_at || req.updated_at),
      level: 'Success',
      icon: 'check-circle'
    });
  } else if (req.delivery_status === 'failed') {
    history.push({
      id: 'h_failed',
      sender: 'System',
      message: `Delivery marked as failed.${req.rider_remark ? ` Remarks: "${req.rider_remark}"` : ''}`,
      time: formatTime(req.updated_at),
      level: 'Error',
      icon: 'exclamation-triangle'
    });
  } else if (req.status === 'cancelled') {
    history.push({
      id: 'h_cancelled',
      sender: 'System',
      message: `Request REQ-${reqIdShort} cancelled. Reason: "${req.admin_remark || 'None'}"`,
      time: formatTime(req.updated_at),
      level: 'Error',
      icon: 'times-circle'
    });
  }

  // 5. User quick replies
  replies.forEach(reply => {
    history.push({
      id: reply.id,
      sender: reply.sender,
      message: reply.message,
      time: reply.time,
      isUserReply: true
    });
  });

  return history;
};

export default function SystemLogs() {
  const { lastRequestUpdate } = useRealTime();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [interactionState, setInteractionState] = useState<Record<string, { read: boolean; replies: LogReply[] }>>({});

  const loadLogs = async () => {
    try {
      const stored = await AsyncStorage.getItem('admin_log_interactions');
      const interactions: Record<string, { read: boolean; replies: LogReply[] }> = stored ? JSON.parse(stored) : {};
      setInteractionState(interactions);

      const response = await api.get('/requests?limit=100');
      const backendJobs = response.data.data || [];

      const mappedLogs: LogItem[] = backendJobs.map((bj: any) => {
        const id = bj.request_id;
        const shortId = id?.slice(-6).toUpperCase() || '---';
        const user = bj.requester_name || 'Personnel';
        const replies = interactions[id]?.replies || [];
        
        let read = true;
        if (interactions[id]) {
          read = interactions[id].read;
        } else if (bj.status === 'pending' || bj.status === 'submitted_waiting') {
          read = false;
        }

        let level: 'Info' | 'Success' | 'Warning' | 'Error' = 'Info';
        let message = `New incoming pending request REQ-${shortId} created by ${user}`;
        let type: 'Dispatch' | 'Auth' | 'System' | 'Request' | 'Error' | 'Admin' = 'Request';

        if (bj.delivery_status === 'completed') {
          level = 'Success';
          message = `Delivery REQ-${shortId} marked as completed`;
          type = 'Dispatch';
        } else if (bj.delivery_status === 'failed') {
          level = 'Error';
          message = `Delivery REQ-${shortId} marked as failed`;
          type = 'Error';
        } else if (bj.status === 'cancelled') {
          level = 'Error';
          message = `Request REQ-${shortId} cancelled by personnel/admin`;
          type = 'Error';
        } else if (bj.delivery_status === 'in_progress') {
          level = 'Info';
          message = `Rider ${bj.assigned_rider_name || 'Rider'} started transit for REQ-${shortId}`;
          type = 'Dispatch';
        } else if (bj.assigned_rider_name) {
          level = 'Info';
          message = `Rider ${bj.assigned_rider_name} assigned to REQ-${shortId}`;
          type = 'Dispatch';
        }

        return {
          id,
          type,
          message,
          time: formatTime(bj.updated_at || bj.created_at),
          level,
          user,
          read,
          replies,
          rawRequest: bj
        };
      });

      mappedLogs.sort((a, b) => {
        const timeA = new Date(a.rawRequest.updated_at || a.rawRequest.created_at).getTime();
        const timeB = new Date(b.rawRequest.updated_at || b.rawRequest.created_at).getTime();
        return timeB - timeA;
      });

      setLogs(mappedLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [lastRequestUpdate]);

  const filteredLogs = filter === 'All' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const handleOpenLog = async (log: LogItem) => {
    const updatedInteractions = {
      ...interactionState,
      [log.id]: {
        read: true,
        replies: interactionState[log.id]?.replies || log.replies
      }
    };
    setInteractionState(updatedInteractions);
    await AsyncStorage.setItem('admin_log_interactions', JSON.stringify(updatedInteractions));

    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, read: true } : l));
    setSelectedLog({ ...log, read: true });
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedLog) return;

    const newReply: LogReply = {
      id: Date.now().toString(),
      sender: 'Admin',
      message: replyText.trim(),
      time: 'Just now'
    };

    const updatedReplies = [...selectedLog.replies, newReply];
    
    const updatedInteractions = {
      ...interactionState,
      [selectedLog.id]: {
        read: true,
        replies: updatedReplies
      }
    };
    setInteractionState(updatedInteractions);
    await AsyncStorage.setItem('admin_log_interactions', JSON.stringify(updatedInteractions));

    setLogs(prev => prev.map(l => {
      if (l.id === selectedLog.id) {
        return { ...l, replies: updatedReplies };
      }
      return l;
    }));

    setSelectedLog({
      ...selectedLog,
      replies: updatedReplies
    });
    setReplyText('');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Success': return '#10B981'; // Green
      case 'Error': return '#EF4444'; // Red
      case 'Warning': return '#F59E0B'; // Amber
      default: return '#3B82F6'; // Blue
    }
  };

  const getLogIcon = (iconName: string) => {
    switch (iconName) {
      case 'Dispatch':
      case 'motorcycle': 
        return 'motorcycle';
      case 'Auth':
      case 'lock': 
        return 'lock';
      case 'System':
      case 'terminal': 
        return 'terminal';
      case 'Error':
      case 'exclamation-triangle': 
        return 'exclamation-triangle';
      case 'Request':
      case 'clipboard-list': 
        return 'clipboard-list';
      case 'user-check':
        return 'user-check';
      case 'check-circle':
        return 'check-circle';
      case 'times-circle':
        return 'times-circle';
      default: 
        return 'user-cog';
    }
  };

  const chatHistory = selectedLog ? buildChatHistory(selectedLog.rawRequest, selectedLog.replies) : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Alerts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'Info', 'Success', 'Warning', 'Error'].map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Inbox Feed */}
      {loading && logs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Syncing real-time alerts...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredLogs.map((log) => {
            const iconColor = getLevelColor(log.level);
            return (
              <TouchableOpacity 
                key={log.id} 
                style={[styles.inboxItem, !log.read && styles.inboxItemUnread]}
                onPress={() => handleOpenLog(log)}
              >
                {/* Messenger style Left Circular Icon */}
                <View style={[styles.avatarContainer, { backgroundColor: `${iconColor}15` }]}>
                  <FontAwesome5 name={getLogIcon(log.type)} size={18} color={iconColor} />
                </View>

                {/* Message Details */}
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.senderName, !log.read && styles.boldText]}>
                      {log.type} Alert ({log.user})
                    </Text>
                    <Text style={styles.timeText}>{log.time}</Text>
                  </View>
                  <Text 
                    style={[styles.messagePreview, !log.read && styles.unreadPreviewText]} 
                    numberOfLines={1}
                  >
                    {log.message}
                  </Text>
                </View>

                {/* Far Right Status Indicator */}
                <View style={styles.statusCol}>
                  {!log.read && <View style={styles.unreadDot} />}
                  {log.read && <MaterialIcons name="chevron-right" size={20} color={COLORS.muted} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Immersive Messenger Conversation Modal */}
      <Modal
        visible={!!selectedLog}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.backButton}>
                <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.primary} />
                <Text style={styles.backText}>Alerts</Text>
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>{selectedLog?.type} Notification</Text>
                <Text style={styles.headerSubtitle}>{selectedLog?.user}</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            {/* Conversation Messages */}
            <ScrollView 
              contentContainerStyle={styles.chatScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedLog && (
                <>
                  <Text style={styles.chatDivider}>REQ-{selectedLog.rawRequest.request_id?.slice(-6).toUpperCase()} TIMELINE</Text>

                  {chatHistory.map((item) => {
                    const isSystem = item.sender === 'System';
                    const isOutgoing = item.sender === 'Admin';
                    
                    if (isSystem) {
                      const bubbleColor = getLevelColor(item.level);
                      return (
                        <View key={item.id} style={styles.incomingContainer}>
                          <View style={[styles.chatAvatar, { backgroundColor: `${bubbleColor}15` }]}>
                            <FontAwesome5 name={getLogIcon(item.icon || selectedLog.type)} size={12} color={bubbleColor} />
                          </View>
                          <View style={styles.incomingWrapper}>
                            <View style={[styles.incomingBubble, { borderLeftColor: bubbleColor }]}>
                              <Text style={styles.incomingText}>{item.message}</Text>
                            </View>
                            <Text style={styles.seenReceipt}>
                              {item.time}
                            </Text>
                          </View>
                        </View>
                      );
                    } else if (isOutgoing) {
                      return (
                        <View key={item.id} style={styles.outgoingContainer}>
                          <View style={styles.outgoingWrapper}>
                            <View style={styles.outgoingBubble}>
                              <Text style={styles.outgoingText}>{item.message}</Text>
                            </View>
                            <Text style={styles.outgoingTime}>
                              Admin • {item.time}
                            </Text>
                          </View>
                        </View>
                      );
                    } else {
                      return (
                        <View key={item.id} style={styles.incomingContainer}>
                          <View style={styles.chatAvatar}>
                            <FontAwesome5 name="terminal" size={12} color={COLORS.secondary} />
                          </View>
                          <View style={styles.incomingWrapper}>
                            <View style={styles.incomingBubble}>
                              <Text style={styles.incomingText}>{item.message}</Text>
                            </View>
                            <Text style={styles.seenReceipt}>
                              {item.sender} • {item.time}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                  })}
                </>
              )}
            </ScrollView>

            {/* Quick Action Chat Input Bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.chatInput}
                placeholder="Acknowledge or type a reply note..."
                placeholderTextColor={COLORS.muted}
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !replyText.trim() && styles.disabledSendButton]}
                onPress={handleSendReply}
                disabled={!replyText.trim()}
              >
                <MaterialIcons 
                  name="send" 
                  size={20} 
                  color={replyText.trim() ? '#3B82F6' : COLORS.muted} 
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    paddingTop: 12,
    paddingHorizontal: moderateScale(24), 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  title: { 
    fontSize: TYPOGRAPHY.size['2xl'], 
    fontFamily: TYPOGRAPHY.fontFamily.bold, 
    color: COLORS.primary, 
    marginBottom: verticalScale(16), 
    letterSpacing: -0.5 
  },
  filterScroll: { marginBottom: verticalScale(12) },
  filterBtn: { 
    paddingHorizontal: moderateScale(16), 
    paddingVertical: verticalScale(8), 
    borderRadius: 12, 
    marginRight: moderateScale(8), 
    backgroundColor: '#F1F5F9' 
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.secondary },
  filterTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: moderateScale(20) },
  inboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: moderateScale(16),
    borderRadius: 20,
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inboxItemUnread: {
    borderColor: '#EFF6FF',
    backgroundColor: '#F8FAFC',
  },
  avatarContainer: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContent: {
    flex: 1,
    marginLeft: moderateScale(14),
    marginRight: moderateScale(6),
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  senderName: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  boldText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: '#0F172A',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  messagePreview: {
    fontSize: 13,
    color: COLORS.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  unreadPreviewText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: '#1E293B',
  },
  statusCol: {
    justifyContent: 'center',
    alignItems: 'center',
    width: moderateScale(24),
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6', 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(12),
    color: COLORS.secondary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  
  // Modal layout
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(14),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: moderateScale(80),
  },
  backText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.primary,
    marginLeft: moderateScale(2),
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    marginTop: verticalScale(1),
  },
  headerSpacer: {
    width: moderateScale(80),
  },
  chatScrollContent: {
    padding: moderateScale(20),
    paddingBottom: verticalScale(40),
  },
  chatDivider: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.muted,
    textAlign: 'center',
    marginVertical: verticalScale(18),
    letterSpacing: 0.5,
  },
  incomingContainer: {
    flexDirection: 'row',
    marginBottom: verticalScale(20),
    alignItems: 'flex-end',
  },
  chatAvatar: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    marginRight: moderateScale(8),
  },
  incomingWrapper: {
    flex: 1,
    alignItems: 'flex-start',
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(12),
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  incomingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    lineHeight: 20,
  },
  seenReceipt: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    marginTop: verticalScale(4),
    marginLeft: moderateScale(4),
  },
  outgoingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: verticalScale(20),
  },
  outgoingWrapper: {
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  outgoingBubble: {
    backgroundColor: '#3B82F6', 
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(12),
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  outgoingText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    lineHeight: 20,
  },
  outgoingTime: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    marginTop: verticalScale(4),
    marginRight: moderateScale(4),
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1,
    height: verticalScale(42),
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: moderateScale(16),
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  sendButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: moderateScale(8),
  },
  disabledSendButton: {
    opacity: 0.4,
  },
});
