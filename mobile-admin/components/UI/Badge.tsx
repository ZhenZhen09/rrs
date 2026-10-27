import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type BadgeProps = {
  label: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Badge({ label, status = 'default', style, textStyle }: BadgeProps) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const getColors = () => {
    switch (status) {
      case 'success': 
        return { bg: COLORS.success + '20', text: COLORS.success }; // Hex opacity 20 = 12.5%
      case 'warning': 
        return { bg: COLORS.warning + '20', text: COLORS.warning };
      case 'danger': 
        return { bg: COLORS.danger + '20', text: COLORS.danger };
      case 'info': 
        return { bg: COLORS.info + '20', text: COLORS.info };
      default: 
        return { bg: COLORS.border, text: COLORS.secondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View className="self-start rounded-xl px-2 py-1" style={[{ backgroundColor: bg }, style]}>
      <Text className="text-[10px] font-extrabold uppercase" style={[{ color: text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}
