export const LIGHT_COLORS = {
  primary: '#2563EB',    // Blue
  onPrimary: '#FFFFFF',
  secondary: '#3B82F6',
  textSecondary: '#475569',
  accent: '#EA580C',
  accentBlue: '#3B82F6',
  accentPink: '#EC4899',
  primaryForeground: '#FFFFFF',
  background: '#EFF6FF',
  foreground: '#1E40AF',
  muted: '#E9EFF8',
  border: '#BFDBFE',
  danger: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  info: '#0284C7',
  onSurface: '#1E40AF',
};

export const DARK_COLORS = {
  primary: '#3B82F6',
  onPrimary: '#FFFFFF',
  secondary: '#60A5FA',
  textSecondary: '#CBD5E1',
  accent: '#F97316',
  accentBlue: '#60A5FA',
  accentPink: '#F472B6',
  primaryForeground: '#FFFFFF',
  background: '#0F172A',
  foreground: '#F8FAFC',
  muted: '#1E293B',
  border: '#334155',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  info: '#38BDF8',
  onSurface: '#F8FAFC',
};

export const BLACK_PINK_COLORS = {
  primary: '#FF1493',    // Deep vibrant pink
  onPrimary: '#000000',
  secondary: '#EC4899',  // Hot pink
  textSecondary: '#D4D4D8',
  accent: '#F472B6',
  accentBlue: '#3B82F6',
  accentPink: '#FF1493',
  primaryForeground: '#000000',
  background: '#000000', // PURE BLACK
  foreground: '#FFFFFF', // Pure white text
  muted: '#18181B',
  border: '#27272A',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  surface: '#111111',    // Slightly elevated black for cards
  surfaceElevated: '#18181B',
  info: '#38BDF8',
  onSurface: '#FFFFFF',
};

export const GOLD_COLORS = {
  primary: '#D4AF37',    // Metallic Gold
  onPrimary: '#000000',
  secondary: '#F1C40F',  // Bright Gold
  textSecondary: '#D6D3D1',
  accent: '#B8860B',     // Dark Goldenrod
  accentBlue: '#3B82F6',
  accentPink: '#EC4899',
  primaryForeground: '#000000',
  background: '#1A1A1A', // Dark charcoal/brownish black
  foreground: '#FdfBF7', // Off-white/gold tint
  muted: '#2C2C2C',
  border: '#D4AF37',     // Gold borders
  danger: '#E74C3C',
  success: '#2ECC71',
  warning: '#F39C12',
  surface: '#242424',    // Elevated dark charcoal
  surfaceElevated: '#2C2C2C',
  info: '#60A5FA',
  onSurface: '#FdfBF7',
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
