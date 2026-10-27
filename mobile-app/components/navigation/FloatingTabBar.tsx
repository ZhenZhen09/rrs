import React, { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

type FloatingTabBarProps = BottomTabBarProps & {
  badgeCounts: Record<string, number>;
};
type FloatingTabItemProps = {
  route: BottomTabBarProps['state']['routes'][number];
  options: BottomTabBarProps['descriptors'][string]['options'];
  emitter: BottomTabBarProps['emitter'];
  navigateToTab: BottomTabBarProps['navigateToTab'];
  focused: boolean;
  count: number;
  reduceMotion: boolean;
};

const RED = '#EF4444';
const INDIGO = '#4F46E5';
const NEUTRAL = '#E2E8F0';

type BadgeTone = 'urgent' | 'attention' | 'neutral';

function useTabMotion(focused: boolean, reduceMotion: boolean) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(focused ? 1 : 0);
      return;
    }

    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      stiffness: 260,
      damping: 18,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [focused, progress, reduceMotion]);

  return {
    scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
    glow: progress.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.34] }),
  };
}

function CountBadge({
  count,
  prominent = false,
  tone = 'urgent',
  testID,
}: {
  count: number;
  prominent?: boolean;
  tone?: BadgeTone;
  testID?: string;
}) {
  if (count <= 0) return null;

  const toneStyle = tone === 'urgent'
    ? styles.urgentBadge
    : tone === 'attention'
      ? styles.attentionBadge
      : styles.neutralBadge;

  return (
    <View testID={testID} style={[styles.countBadge, toneStyle, prominent && styles.prominentCountBadge]}>
      <Text allowFontScaling={false} style={[styles.countText, tone === 'neutral' && styles.neutralCountText]}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function FloatingTabItem({ route, options, emitter, navigateToTab, focused, count, reduceMotion }: FloatingTabItemProps) {
  const label = options.title ?? route.name;
  const isToday = route.name === 'index';
  const badgeTone: BadgeTone = route.name === 'overdue'
    ? 'urgent'
    : route.name === 'inbox'
      ? 'attention'
      : 'neutral';
  const { scale, glow } = useTabMotion(focused, reduceMotion);
  const color = isToday ? (focused ? '#FFFFFF' : '#6D3EF4') : focused ? '#6D3EF4' : '#6B7E96';
  const icon = options.tabBarIcon?.({ focused, color, size: isToday ? 24 : 23 });
  const accessibilityLabel = count > 0
    ? `${label}, ${route.name === 'inbox'
      ? `${count} unread ${count === 1 ? 'conversation' : 'conversations'}`
      : `${count} ${count === 1 ? 'task' : 'tasks'}`}`
    : label;

  const onPress = () => {
    const event = emitter.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigateToTab(route.key);
    }
  };

  const onLongPress = () => {
    emitter.emit({ type: 'tabLongPress', target: route.key });
  };

  const onPressIn = () => {
    if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (isToday) {
    return (
      <>
        <View style={styles.centerSpacer} />
        <Pressable
          testID={`tab-button-${route.name}`}
          accessibilityRole="tab"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected: focused }}
          onPressIn={onPressIn}
          onPress={onPress}
          onLongPress={onLongPress}
          android_ripple={{ color: '#EDE9FE', borderless: true }}
          style={styles.todayButton}
        >
          <Animated.View testID="today-center-glow" style={[styles.todayGlow, { opacity: focused ? glow : 0, transform: [{ scale }] }]} />
          <Animated.View testID="today-center-circle" style={[styles.todayCircle, !focused && styles.todayCircleInactive, { transform: [{ scale }] }]}>
            <LinearGradient
              testID="today-gradient"
              colors={focused ? ['#6366F1', '#7C3AED', '#8B5CF6'] : ['#EDE9FE', '#F5F3FF', '#F5F3FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.todayGradient}
            >
              {icon}
            </LinearGradient>
            <CountBadge count={count} prominent tone={badgeTone} testID={`tab-badge-${route.name}`} />
          </Animated.View>
          <Text allowFontScaling numberOfLines={1} style={[styles.todayLabel, focused && styles.activeLabel]}>
            {label}
          </Text>
        </Pressable>
      </>
    );
  }

  return (
    <Pressable
      testID={`tab-button-${route.name}`}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: focused }}
      onPressIn={onPressIn}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: '#EDE9FE', borderless: true }}
      style={styles.tabButton}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {icon}
        <CountBadge count={count} tone={badgeTone} testID={`tab-badge-${route.name}`} />
      </Animated.View>
      <Text allowFontScaling numberOfLines={1} style={[styles.tabLabel, focused && styles.activeLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets, badgeCounts }: FloatingTabBarProps) {
  const reduceMotion = useReducedMotionPreference();
  const bottomInset = Math.max(0, insets.bottom);
  const [entranceProgress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      entranceProgress.stopAnimation();
      entranceProgress.setValue(1);
      return;
    }

    const frame = requestAnimationFrame(() => {
      Animated.timing(entranceProgress, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(frame);
  }, [entranceProgress, reduceMotion]);

  return (
    <View testID="floating-tabbar-background" style={[styles.root, { height: 100 + bottomInset }]}>
      <Animated.View style={[
        styles.bar,
        {
          opacity: entranceProgress,
          transform: [{ translateY: entranceProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
        { bottom: bottomInset + 8 },
      ]}>
        {state.routes.map((route, index) => (
          <FloatingTabItem
            key={route.key}
            route={route}
            options={descriptors[route.key].options}
            emitter={emitter}
            navigateToTab={navigateToTab}
            focused={state.index === index}
            count={badgeCounts[route.name] ?? 0}
            reduceMotion={reduceMotion}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'visible',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  bar: {
    position: 'absolute',
    left: 18,
    right: 18,
    maxWidth: 520,
    height: 84,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 4,
    shadowColor: '#24345B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'visible',
  },
  tabButton: {
    flex: 1,
    minWidth: 44,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 2,
  },
  tabLabel: {
    maxWidth: '100%',
    color: '#66778E',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeLabel: {
    color: '#6D3EF4',
    fontWeight: '800',
  },
  centerSpacer: {
    flex: 1,
    height: 64,
  },
  todayButton: {
    position: 'absolute',
    top: -22,
    left: '50%',
    marginLeft: -37,
    width: 74,
    height: 102,
    alignItems: 'center',
    zIndex: 5,
  },
  todayGlow: {
    position: 'absolute',
    top: -3,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#9F7AFF',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  todayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#753AF2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D3EF4',
    shadowOpacity: 0.28,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  todayCircleInactive: {
    backgroundColor: '#EDE9FE',
    shadowOpacity: 0,
    elevation: 0,
  },
  todayGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLabel: {
    marginTop: 6,
    color: '#66778E',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    left: -7,
    minWidth: 21,
    height: 21,
    paddingHorizontal: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBadge: {
    backgroundColor: RED,
  },
  attentionBadge: {
    backgroundColor: INDIGO,
  },
  neutralBadge: {
    backgroundColor: NEUTRAL,
  },
  prominentCountBadge: {
    top: 2,
    left: 2,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  neutralCountText: {
    color: '#334155',
  },
});
