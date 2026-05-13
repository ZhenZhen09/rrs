import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  onNotificationClick: (notif: any) => void;
  onMarkAllRead: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAllRead,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onMarkAllRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <MaterialIcons name="notifications-none" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.item, !notif.is_read && styles.unreadItem]}
                  onPress={() => onNotificationClick(notif)}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.typeIcon}>
                      <MaterialIcons 
                        name={notif.type === 'new_assignment' ? 'assignment' : 'info'} 
                        size={18} 
                        color={notif.type === 'new_assignment' ? '#3B82F6' : '#64748B'} 
                      />
                    </View>
                    <Text style={styles.time}>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={[styles.message, !notif.is_read && styles.unreadMessage]}>
                    {notif.message}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    height: Dimensions.get('window').height * 0.7,
    padding: moderateScale(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: normalizeFontSize(20),
    fontWeight: '800',
    color: '#0F172A',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: verticalScale(12),
  },
  markAllText: {
    fontSize: normalizeFontSize(12),
    color: '#3B82F6',
    fontWeight: '700',
  },
  list: {
    paddingBottom: verticalScale(20),
  },
  item: {
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    backgroundColor: '#F8FAFC',
    marginBottom: verticalScale(8),
  },
  unreadItem: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  typeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  time: {
    fontSize: normalizeFontSize(10),
    color: '#94A3B8',
    fontWeight: '600',
  },
  message: {
    fontSize: normalizeFontSize(14),
    color: '#475569',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#1E293B',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    marginTop: verticalScale(12),
    color: '#94A3B8',
    fontSize: normalizeFontSize(14),
    fontWeight: '600',
  },
});
