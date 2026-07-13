export const LIGHT_COLORS = {
  primary: '#2563EB',    // Tracking Blue
  onPrimary: '#FFFFFF',
  secondary: '#3B82F6',
  accent: '#EA580C',     // Delivery Orange (CTA)
  accentBlue: '#3B82F6',
  accentPink: '#EC4899',
  primaryForeground: '#FFFFFF',
  background: '#EFF6FF', // Soft blue-tinted white
  foreground: '#1E40AF', // Deep blue text
  muted: '#E9EFF8',
  border: '#BFDBFE',
  danger: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
  surface: '#FFFFFF',
  onSurface: '#1E40AF',
};

export const DARK_COLORS = {
  primary: '#3B82F6',
  onPrimary: '#FFFFFF',
  secondary: '#60A5FA',
  accent: '#F97316',
  accentBlue: '#60A5FA',
  accentPink: '#F472B6',
  primaryForeground: '#FFFFFF',
  background: '#0F172A', // Very dark slate
  foreground: '#F8FAFC', // Near white text
  muted: '#1E293B',
  border: '#334155',
  danger: '#EF4444',
  success: '#10B981', // green-500
  warning: '#F59E0B',
  surface: '#1E293B',
  onSurface: '#F8FAFC',
};

// Default export fallback for files not yet refactored to useTheme
export const COLORS = LIGHT_COLORS;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  card: 12,
  button: 8,
  modal: 24,
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'FiraSans-Regular',
    medium: 'FiraSans-Medium',
    bold: 'FiraSans-Bold',
    mono: 'FiraCode-Regular',
    monoMedium: 'FiraCode-Medium',
    monoBold: 'FiraCode-Bold',
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
};

export const SPACING = {
  compact: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    cardPadding: 12,
  },
  default: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    cardPadding: 16,
  },
  relaxed: {
    xs: 6,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    cardPadding: 24,
  }
};
