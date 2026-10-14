import React, { useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Job } from '@/types';
import { useLocation } from '@/context/LocationContext';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { verticalScale } from '@/utils/responsive';
import { ShiftControlCard } from '@/components/ShiftControlCard';

interface ShiftControlDrawerProps {
  tasks: Job[];
}

export const ShiftControlDrawer: React.FC<ShiftControlDrawerProps> = ({ tasks }) => {
  const { hasOpenShift, isOnDuty, attendanceStatus, isShiftStatusReady } = useLocation();
  const reduceMotion = useReducedMotionPreference();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  const statusLabel = !isShiftStatusReady
    ? 'Checking status'
    : hasOpenShift
      ? isOnDuty ? 'Online' : 'Offline'
      : attendanceStatus === 'present'
        ? 'Shift ended'
        : attendanceStatus === 'absent'
          ? 'Absent'
          : attendanceStatus === 'on_leave'
            ? 'On leave'
            : 'Not started';

  const setExpanded = (expanded: boolean) => {
    setIsOpen(expanded);
    progress.stopAnimation();

    if (!expanded) {
      progress.setValue(0);
      setIsMounted(false);
      return;
    }

    if (reduceMotion) {
      progress.setValue(1);
      setIsMounted(true);
      return;
    }

    setIsMounted(true);
    requestAnimationFrame(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const panelStyle = {
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
  };

  return (
    <View testID="shift-drawer-anchor" pointerEvents="box-none" style={styles.anchor}>
      {isMounted && (
        <Animated.View
          testID="shift-drawer-panel"
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[styles.panel, panelStyle]}
        >
          <ShiftControlCard tasks={tasks} />
        </Animated.View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isOpen ? 'Close' : 'Open'} shift controls, ${statusLabel}`}
        accessibilityHint="Shows or hides today's shift actions."
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setExpanded(!isOpen)}
        android_ripple={{ color: 'rgba(15, 118, 110, 0.12)', borderless: true, radius: 24 }}
        style={({ pressed }) => [styles.handle, pressed && styles.handlePressed]}
      >
        <View testID="shift-drawer-handle-visual" style={styles.handleVisual}>
          <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={20} color="#164E63" />
        </View>
      </Pressable>
    </View>
  );
};

const handleTouchHeight = Platform.select({ ios: 44, android: 48, default: 48 });

const styles = StyleSheet.create({
  anchor: {
    height: 0,
    overflow: 'visible',
    zIndex: 50,
    elevation: 50,
  },
  handle: {
    position: 'absolute',
    top: 0,
    zIndex: 51,
    elevation: 51,
    alignSelf: 'center',
    minHeight: handleTouchHeight,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  handleVisual: {
    width: 36,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  handlePressed: {
    opacity: 0.82,
  },
  panel: {
    position: 'absolute',
    top: verticalScale(12),
    left: 0,
    right: 0,
    zIndex: 49,
    elevation: 49,
  },
});
