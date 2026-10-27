import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { useRealTimeStore } from '../../store/useRealTimeStore';
import api from '../../services/api';
import { useDebounce } from '../../utils/useDebounce';

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
  const rawLastRequestUpdate = useRealTimeStore(state => state.lastRequestUpdate);
  const lastRequestUpdate = useDebounce(rawLastRequestUpdate, 2000);
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <View className="border-b px-6 pt-3" style={{ backgroundColor: '#FFFFFF', borderBottomColor: COLORS.border }}>
        <Text className="mb-4 text-2xl font-bold tracking-[-0.5px]" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>System Alerts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          {['All', 'Info', 'Success', 'Warning', 'Error'].map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f)}
              className="mr-2 rounded-xl px-4 py-2" style={{ backgroundColor: filter === f ? COLORS.primary : '#F1F5F9' }}
            >
              <Text className="text-[13px] font-bold" style={{ color: filter === f ? '#FFFFFF' : COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Inbox Feed */}
      {loading && logs.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-3 text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Syncing real-time alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={log => log.id}
          contentContainerStyle={{ padding: moderateScale(20) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: log }) => {
            const iconColor = getLevelColor(log.level);
            return (
              <TouchableOpacity 
                className="mb-3 flex-row items-center rounded-3xl border p-4" style={{ backgroundColor: !log.read ? '#F8FAFC' : '#FFFFFF', borderColor: !log.read ? '#EFF6FF' : COLORS.border }}
                onPress={() => handleOpenLog(log)}
              >
                {/* Messenger style Left Circular Icon */}
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${iconColor}15` }}>
                  <FontAwesome5 name={getLogIcon(log.type)} size={18} color={iconColor} />
                </View>

                {/* Message Details */}
                <View className="ml-3.5 mr-1.5 flex-1">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-sm" style={{ color: !log.read ? '#0F172A' : COLORS.primary, fontFamily: !log.read ? TYPOGRAPHY.fontFamily.bold : TYPOGRAPHY.fontFamily.medium }}>
                      {log.type} Alert ({log.user})
                    </Text>
                    <Text className="text-[11px]" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{log.time}</Text>
                  </View>
                  <Text 
                    className="text-[13px]" style={{ color: !log.read ? '#1E293B' : COLORS.secondary, fontFamily: !log.read ? TYPOGRAPHY.fontFamily.bold : TYPOGRAPHY.fontFamily.medium }}
                    numberOfLines={1}
                  >
                    {log.message}
                  </Text>
                </View>

                {/* Far Right Status Indicator */}
                <View className="w-6 items-center justify-center">
                  {!log.read && <View className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                  {log.read && <MaterialIcons name="chevron-right" size={20} color={COLORS.muted} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Immersive Messenger Conversation Modal */}
      <Modal
        visible={!!selectedLog}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: '#F8FAFC' }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between border-b px-4 py-3.5" style={{ backgroundColor: '#FFFFFF', borderBottomColor: COLORS.border }}>
              <TouchableOpacity onPress={() => setSelectedLog(null)} className="w-20 flex-row items-center">
                <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.primary} />
                <Text className="ml-0.5 text-[15px] font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Alerts</Text>
              </TouchableOpacity>
              <View className="flex-1 items-center">
                <Text className="text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedLog?.type} Notification</Text>
                <Text className="mt-px text-[11px] font-bold" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedLog?.user}</Text>
              </View>
              <View className="w-20" />
            </View>

            {/* Conversation Messages */}
            <ScrollView 
              contentContainerStyle={{ padding: moderateScale(20), paddingBottom: verticalScale(40) }}
              showsVerticalScrollIndicator={false}
            >
              {selectedLog && (
                <>
                  <Text className="my-4 text-center text-[10px] font-bold tracking-wider" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>REQ-{selectedLog.rawRequest.request_id?.slice(-6).toUpperCase()} TIMELINE</Text>

                  {chatHistory.map((item) => {
                    const isSystem = item.sender === 'System';
                    const isOutgoing = item.sender === 'Admin';
                    
                    if (isSystem) {
                      const bubbleColor = getLevelColor(item.level);
                      return (
                        <View key={item.id} className="mb-5 flex-row items-end">
                          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${bubbleColor}15` }}>
                            <FontAwesome5 name={getLogIcon(item.icon || selectedLog.type)} size={12} color={bubbleColor} />
                          </View>
                          <View className="flex-1 items-start">
                            <View className="max-w-[85%] rounded-3xl border border-l-4 px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: COLORS.border, borderLeftColor: bubbleColor }}>
                              <Text className="text-sm leading-5" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{item.message}</Text>
                            </View>
                            <Text className="ml-1 mt-1 text-[10px] font-bold" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                              {item.time}
                            </Text>
                          </View>
                        </View>
                      );
                    } else if (isOutgoing) {
                      return (
                        <View key={item.id} className="mb-5 flex-row justify-end">
                          <View className="max-w-[80%] items-end">
                            <View className="rounded-3xl bg-blue-500 px-4 py-3">
                              <Text className="text-sm leading-5 text-white" style={{ fontFamily: TYPOGRAPHY.fontFamily.medium }}>{item.message}</Text>
                            </View>
                            <Text className="mr-1 mt-1 text-[10px] font-bold" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                              Admin â€¢ {item.time}
                            </Text>
                          </View>
                        </View>
                      );
                    } else {
                      return (
                        <View key={item.id} className="mb-5 flex-row items-end">
                          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full">
                            <FontAwesome5 name="terminal" size={12} color={COLORS.secondary} />
                          </View>
                          <View className="flex-1 items-start">
                            <View className="max-w-[85%] rounded-3xl border border-l-4 px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: COLORS.border }}>
                              <Text className="text-sm leading-5" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{item.message}</Text>
                            </View>
                            <Text className="ml-1 mt-1 text-[10px] font-bold" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                              {item.sender} â€¢ {item.time}
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
            <View className="flex-row items-center border-t px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderTopColor: COLORS.border }}>
              <TextInput
                className="h-11 flex-1 rounded-3xl px-4 text-sm" style={{ backgroundColor: '#F1F5F9', color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }}
                placeholder="Acknowledge or type a reply note..."
                placeholderTextColor={COLORS.muted}
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity 
                className="ml-2 h-10 w-10 items-center justify-center" style={{ opacity: replyText.trim() ? 1 : 0.4 }}
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

