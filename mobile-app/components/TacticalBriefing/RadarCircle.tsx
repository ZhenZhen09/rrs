import React, { useEffect } from 'react';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';

interface Props {
  size: number;
  color: string;
  delay?: number;
  duration?: number;
  pulsate?: boolean;
}

export const RadarCircle = ({ size, color, delay = 0, duration = 2000, pulsate = true }: Props) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (pulsate) {
      progress.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
          -1,
          false
        )
      );
    }
  }, [pulsate, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: color,
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1.5]) }],
    position: 'absolute',
  }));

  return <Animated.View style={animatedStyle} />;
};
