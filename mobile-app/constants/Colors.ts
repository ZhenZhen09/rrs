const tintColorLight = '#000000';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#1A202C',
    background: '#EEF2FF', // Light blue/lavender background from screenshot
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#000000',
    primary: '#000000', // Black buttons from screenshot
    secondary: '#F1F5F9',
    success: '#10B981', // Green for pickup
    warning: '#F59E0B',
    danger: '#EF4444', // Red for drop-off/urgent
    urgent: '#EF4444',
    cardBackground: '#FFFFFF',
    border: '#E2E8F0',
    accent: '#3B82F6', // Blue for map icons
    badgeOnWay: '#FEF3C7',
    badgeOnWayText: '#D97706',
    badgeBank: '#F1F5F9',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#FFFFFF',
    secondary: '#334155',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    cardBackground: '#1E293B',
    border: '#334155',
  },
};
