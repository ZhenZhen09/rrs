import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
  const progress = useSharedValue(0);

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
    if (reduceMotion) {
      progress.value = expanded ? 1 : 0;
      return;
    }

    progress.value = withTiming(expanded ? 1 : 0, {
      duration: expanded ? 260 : 220,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

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
          <Animated.View style={chevronStyle}>
            <MaterialIcons name="expand-more" size={18} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.handleText}>{isOpen ? 'Shift controls' : !isShiftStatusReady ? 'Checking shift' : isOnDuty ? 'On Duty' : 'Off Duty'}</Text>
        </View>
      </Pressable>}

      {!showDirectCard && isOpen && (
        <Animated.View
          testID="shift-drawer-panel"
          entering={reduceMotion ? undefined : FadeInUp.duration(260).easing(Easing.out(Easing.cubic))}
          exiting={reduceMotion ? undefined : FadeOutUp.duration(220).easing(Easing.in(Easing.cubic))}
          layout={reduceMotion ? undefined : LinearTransition.duration(260).easing(Easing.inOut(Easing.cubic))}
          style={styles.panel}
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
