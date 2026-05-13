import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { Badge } from '@/components/ui/Badge';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeStatus?: 'success' | 'warning' | 'danger' | 'info';
  onNotifPress: () => void;
  onLogoutPress: () => void;
  unreadCount?: number;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  badgeLabel,
  badgeStatus = 'info',
  onNotifPress,
  onLogoutPress,
  unreadCount = 0,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="directions-bike" size={22} color="#0F172A" />
          <Text style={styles.title}>{title}</Text>
          {badgeLabel && <Badge label={badgeLabel} status={badgeStatus} />}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity testID="header_notifications_button" onPress={onNotifPress} style={styles.iconButton}>
            <MaterialIcons name="notifications-none" size={24} color="#64748B" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity testID="header_logout_button" onPress={onLogoutPress} style={[styles.iconButton, styles.logoutButton]}>
            <MaterialIcons name="logout" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: normalizeFontSize(20),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoutButton: {
    backgroundColor: '#FFF1F2',
  },
  notifBadge: {
    position: 'absolute',
    top: moderateScale(8),
    right: moderateScale(8),
    backgroundColor: '#EF4444',
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(8),
    fontWeight: '900',
  },
  subtitle: {
    fontSize: normalizeFontSize(14),
    color: '#64748B',
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
});
