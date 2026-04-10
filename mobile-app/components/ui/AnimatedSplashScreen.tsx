import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence,
  withTiming,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
}

export function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#000000' }, 'background');
  
  // Animation values
  const translateX = useSharedValue(-width); // Start off-screen left
  const scale = useSharedValue(0.5);
  const rotation = useSharedValue(0);
  const bounce = useSharedValue(0);

  useEffect(() => {
    // 1. Slide in from left
    translateX.value = withSpring(0, { damping: 12, stiffness: 90 });
    
    // 2. Scale up
    scale.value = withSpring(1, { damping: 12, stiffness: 90 });

    // 3. Constant riding bounce/vibration
    bounce.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 150 }),
        withTiming(0, { duration: 150 })
      ),
      -1, // Infinite
      true
    );

    // 4. Subtle tilt to simulate forward motion
    rotation.value = withTiming(-5, { duration: 1000 });

    // Finish after some time or when prop says so
    // For demo, let's trigger completion after 2.5s
    const timer = setTimeout(() => {
        if (onAnimationComplete) {
            onAnimationComplete();
        }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: bounce.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.Image
        source={require('@/assets/images/splash-icon.png')}
        style={[styles.image, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
  },
});
