import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { scale } from '@/utils/responsive';

type TaskDetailIconProps = {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  backgroundColor: string;
  size?: number;
};

export function TaskDetailIcon({ name, iconColor, backgroundColor, size = 16 }: TaskDetailIconProps) {
  return (
    <View
      testID="task-detail-icon"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.orb, { backgroundColor }]}
    >
      <View testID="task-detail-icon-inner" style={styles.inner}>
        <MaterialIcons name={name} size={size} color={iconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(7),
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  inner: {
    width: scale(23),
    height: scale(23),
    borderRadius: scale(11.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 1,
  },
});
