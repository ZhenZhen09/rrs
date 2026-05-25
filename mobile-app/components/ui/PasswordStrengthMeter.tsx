import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
  score: number; // 0 to 3
}

export default function PasswordStrengthMeter({ score }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const barWidth: DimensionValue = `${((score / 3) * 100).toFixed(2)}%`;

  const getColor = () => {
    if (score === 1) return theme.danger;
    if (score === 2) return theme.warning;
    if (score === 3) return theme.success;
    return theme.border;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.border }]} testID="strength-meter">
      <View style={[styles.bar, { width: barWidth, backgroundColor: getColor() }]} testID="strength-bar" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
});
