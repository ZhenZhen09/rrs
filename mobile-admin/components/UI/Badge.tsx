import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/Theme';

export type BadgeProps = {
  label: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Badge({ label, status = 'default', style, textStyle }: BadgeProps) {
  const getColors = () => {
    switch (status) {
      case 'success': 
        return { bg: COLORS.success + '20', text: COLORS.success }; // Hex opacity 20 = 12.5%
      case 'warning': 
        return { bg: COLORS.warning + '20', text: COLORS.warning };
      case 'danger': 
        return { bg: COLORS.danger + '20', text: COLORS.danger };
      case 'info': 
        return { bg: COLORS.accentBlue + '20', text: COLORS.accentBlue };
      default: 
        return { bg: COLORS.border, text: COLORS.secondary };
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
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
