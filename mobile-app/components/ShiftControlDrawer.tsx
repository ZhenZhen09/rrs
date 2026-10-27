import React, { useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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

  const showDirectCard = isShiftStatusReady && !isOnDuty;

  const statusLabel = !isShiftStatusReady
    ? 'Checking status'
    : hasOpenShift
      ? isOnDuty ? 'On Duty' : 'Off Duty'
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
    <View testID="shift-drawer-anchor" style={styles.anchor}>
      {showDirectCard && <ShiftControlCard tasks={tasks} />}
      {!showDirectCard && <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isOpen ? 'Hide' : 'Show'} shift controls, ${statusLabel}`}
        accessibilityHint="Shows or hides today's shift actions."
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setExpanded(!isOpen)}
        style={({ pressed }) => [styles.handle, pressed && styles.handlePressed]}
      >
        <View testID="shift-drawer-handle-visual" style={styles.handleVisual}>
          <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={18} color="#FFFFFF" />
          <Text style={styles.handleText}>{isOpen ? 'Shift controls' : !isShiftStatusReady ? 'Checking shift' : isOnDuty ? 'On Duty' : 'Off Duty'}</Text>
        </View>
      </Pressable>}

      {!showDirectCard && isMounted && (
        <Animated.View
          testID="shift-drawer-panel"
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[styles.panel, panelStyle]}
        >
          <ShiftControlCard tasks={tasks} />
        </Animated.View>
      )}
    </View>
  );
};

const handleTouchHeight = Platform.select({ ios: 44, android: 48, default: 48 });

const styles = StyleSheet.create({
  anchor: {
    zIndex: 50,
    elevation: 8,
    backgroundColor: 'transparent',
    paddingTop: verticalScale(4),
  },
  handle: {
    alignSelf: 'stretch',
    minHeight: handleTouchHeight,
    marginHorizontal: 16,
    marginBottom: verticalScale(4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  handleVisual: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#0F766E',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  handleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  handlePressed: {
    opacity: 0.82,
  },
  panel: { zIndex: 49, elevation: 6 },
});
