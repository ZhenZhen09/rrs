import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/use-theme-color';

export type BadgeProps = {
  label: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Badge({ label, status = 'default', style, textStyle }: BadgeProps) {
  const isDark = useThemeColor({ light: '', dark: '' }, 'background') === Colors.dark.background;
  const themeColors = isDark ? Colors.dark : Colors.light;

  const getColors = () => {
    switch (status) {
      case 'success': return { bg: themeColors.success + '20', text: themeColors.success }; // 20 is opacity in hex
      case 'warning': return { bg: themeColors.warning + '20', text: themeColors.warning };
      case 'danger': return { bg: themeColors.danger + '20', text: themeColors.danger };
      case 'info': return { bg: themeColors.primary + '20', text: themeColors.primary };
      default: return { bg: themeColors.border, text: themeColors.text };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
