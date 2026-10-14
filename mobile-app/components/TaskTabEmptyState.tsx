import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { normalizeFontSize, scale, verticalScale } from '@/utils/responsive';

type TaskTabEmptyStateProps = {
  variant: 'overdue' | 'upcoming';
  icon: React.ReactNode;
  title: string;
  message: string;
};

export function TaskTabEmptyState({ variant, icon, title, message }: TaskTabEmptyStateProps) {
  return (
    <View testID="task-tab-empty-state" style={styles.container}>
      <View
        testID="task-tab-empty-icon"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.icon, variant === 'overdue' ? styles.overdueIcon : styles.upcomingIcon]}
      >
        {icon}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(24),
  },
  icon: {
    width: scale(76),
    height: scale(76),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(14),
  },
  overdueIcon: {
    borderRadius: scale(38),
    backgroundColor: '#DDF8ED',
  },
  upcomingIcon: {
    borderRadius: scale(22),
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: '#D8E7FC',
  },
  title: {
    fontSize: normalizeFontSize(21),
    fontWeight: '800',
    color: '#0B2142',
    textAlign: 'center',
  },
  message: {
    maxWidth: 320,
    fontSize: normalizeFontSize(15),
    lineHeight: normalizeFontSize(22),
    color: '#63758F',
    textAlign: 'center',
    marginTop: verticalScale(7),
  },
});
