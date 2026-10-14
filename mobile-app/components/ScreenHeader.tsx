import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale, normalizeFontSize } from '@/utils/responsive';
import { Badge } from '@/components/ui/Badge';
import { RiderAvatar } from '@/components/profile/RiderAvatar';

interface ScreenHeaderProps {
  variant?: 'default' | 'hero';
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeStatus?: 'success' | 'warning' | 'danger' | 'info';
  titleAccessory?: React.ReactNode;
  onNotifPress: () => void;
  onSettingsPress?: () => void;
  onLogoutPress: () => void;
  unreadCount?: number;
  profileName?: string;
  profileAvatarId?: string | null;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  variant = 'default',
  title,
  subtitle,
  badgeLabel,
  badgeStatus = 'info',
  titleAccessory,
  onNotifPress,
  onSettingsPress,
  onLogoutPress,
  unreadCount = 0,
  profileName = 'Rider',
  profileAvatarId,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  if (variant === 'hero') {
    return (
      <LinearGradient
        colors={['#0B3554', '#17586B', '#397B78']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.7 }}
        testID="hero-header"
        style={styles.heroHeader}
      >
        <View pointerEvents="none" style={styles.heroArtwork}>
          <View style={styles.heroGlow} />
          <MaterialIcons name="delivery-dining" size={126} color="#D5F5EE" style={styles.heroRider} />
          <View style={styles.heroSkyline} />
        </View>
        <View style={styles.heroActionsRow}>
          <View testID="hero-title-row" style={styles.heroTitleRow}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.heroTitle}>{title}</Text>
            {titleAccessory}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              testID="header_notifications_button"
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              onPress={onNotifPress}
              style={styles.heroButtonHitArea}
            >
              <View testID="header_notifications_surface" style={styles.heroButtonSurface}>
                <MaterialIcons name="notifications-none" size={17} color="#173B56" />
              </View>
              {unreadCount > 0 && (
                <View style={styles.heroNotifBadge}>
                  <Text style={styles.heroNotifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              testID="header_profile_menu_button"
              accessibilityRole="button"
              accessibilityLabel="Profile options"
              accessibilityState={{ expanded: profileMenuOpen }}
              onPress={() => setProfileMenuOpen(true)}
              style={styles.heroButtonHitArea}
            >
              <View style={styles.profileAvatarBorder}>
                <RiderAvatar avatarId={profileAvatarId} name={profileName} size={32} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
        <Modal transparent visible={profileMenuOpen} animationType="fade" statusBarTranslucent onRequestClose={() => setProfileMenuOpen(false)}>
          <View style={styles.profileMenuOverlay}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close profile menu" onPress={() => setProfileMenuOpen(false)} style={StyleSheet.absoluteFill} />
            <View accessibilityRole="menu" accessibilityLabel="Profile menu" style={styles.profileMenu}>
              {onSettingsPress && <TouchableOpacity
                testID="header_settings_button"
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => { setProfileMenuOpen(false); onSettingsPress(); }}
                style={styles.profileMenuItem}
              >
                <MaterialIcons name="settings" size={20} color="#173B56" />
                <Text style={styles.profileMenuText}>Settings</Text>
              </TouchableOpacity>}
              <TouchableOpacity
                testID="header_logout_button"
                accessibilityRole="button"
                accessibilityLabel="Log out"
                onPress={() => { setProfileMenuOpen(false); onLogoutPress(); }}
                style={styles.profileMenuItem}
              >
                <MaterialIcons name="logout" size={20} color="#C62838" />
                <Text style={styles.profileMenuLogoutText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="directions-bike" size={22} color="#0F172A" />
          <Text style={styles.title}>{title}</Text>
          {badgeLabel && <Badge label={badgeLabel} status={badgeStatus} />}
        </View>

        <View style={styles.actions}>
          {onSettingsPress && <TouchableOpacity testID="header_settings_button" accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettingsPress} style={styles.iconButton}>
            <MaterialIcons name="settings" size={22} color="#64748B" />
          </TouchableOpacity>}
          <TouchableOpacity testID="header_notifications_button" onPress={onNotifPress} style={styles.iconButton}>
            <MaterialIcons name="notifications-none" size={24} color="#64748B" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity testID="header_logout_button" accessibilityLabel="Log out" onPress={onLogoutPress} style={[styles.iconButton, styles.logoutButton]}>
            <MaterialIcons name="logout" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  heroHeader: {
    minHeight: 92,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(12),
    overflow: 'hidden',
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: moderateScale(44),
    gap: scale(4),
  },
  heroArtwork: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -scale(40),
    top: -verticalScale(35),
    width: scale(170),
    height: scale(170),
    borderRadius: scale(85),
    backgroundColor: '#DDF5CF',
    opacity: 0.13,
  },
  heroRider: {
    position: 'absolute',
    right: scale(28),
    bottom: verticalScale(-28),
    opacity: 0.13,
  },
  heroSkyline: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: verticalScale(32),
    width: '56%',
    backgroundColor: '#D5F5EE',
    opacity: 0.07,
    borderTopLeftRadius: 80,
  },
  heroButtonHitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroButtonSurface: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#062D45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
  },
  heroLogoutButton: {
    backgroundColor: '#FFF9FA',
  },
  profileAvatarBorder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 28, 43, 0.18)',
  },
  profileMenu: {
    position: 'absolute',
    top: verticalScale(58),
    right: scale(16),
    minWidth: scale(184),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(14),
    backgroundColor: '#FFFFFF',
    shadowColor: '#062D45',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  profileMenuItem: {
    minHeight: 48,
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  profileMenuText: {
    color: '#173B56',
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
  },
  profileMenuLogoutText: {
    color: '#C62838',
    fontSize: normalizeFontSize(15),
    fontWeight: '700',
  },
  heroNotifBadge: {
    position: 'absolute',
    top: 1,
    right: 0,
    minWidth: moderateScale(18),
    height: moderateScale(18),
    paddingHorizontal: 4,
    borderRadius: moderateScale(9),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: normalizeFontSize(9),
    fontWeight: '800',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    flexShrink: 1,
    fontSize: normalizeFontSize(17),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    marginTop: verticalScale(4),
    color: '#E3F0F4',
    fontSize: normalizeFontSize(14),
    fontWeight: '600',
  },
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
    width: 44,
    height: 44,
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
