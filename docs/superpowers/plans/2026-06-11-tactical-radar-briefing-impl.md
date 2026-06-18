# Tactical Radar Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a high-impact, eye-catching entry screen (Mission Briefing) that summarizes active tasks and prioritizes overdues every time the rider opens the app.

**Architecture:** A standalone global component integrated into the root `_layout.tsx` that uses `react-native-reanimated` for tactical animations and `AppState` to trigger on cold starts/foregrounding.

**Tech Stack:** React Native (Expo), TypeScript, Reanimated 3, Expo Haptics, AsyncStorage.

---

### Task 1: Create the Radar Component Core

**Files:**
- Create: `mobile-app/components/TacticalBriefing/RadarBriefing.tsx`
- Create: `mobile-app/components/TacticalBriefing/RadarCircle.tsx`

- [ ] **Step 1: Implement the animated RadarCircle**
Create a reusable pulsating circle component using `react-native-reanimated`.

```tsx
// mobile-app/components/TacticalBriefing/RadarCircle.tsx
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
import { StyleSheet, View } from 'react-native';

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
  }, [pulsate]);

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
```

- [ ] **Step 2: Implement the RadarBriefing main component**
Create the full-screen overlay with the "Condition" heading and "Next Stop" banner.

```tsx
// mobile-app/components/TacticalBriefing/RadarBriefing.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { RadarCircle } from './RadarCircle';
import { scale, verticalScale, normalizeFontSize } from '@/utils/responsive';
import { Job } from '@/types';

const { width, height } = Dimensions.get('window');

interface Props {
  overdueCount: number;
  todayCount: number;
  nextTask: Job | null;
  onDismiss: () => void;
}

export const RadarBriefing = ({ overdueCount, todayCount, nextTask, onDismiss }: Props) => {
  const totalTasks = overdueCount + todayCount;
  const isConditionRed = overdueCount > 0;

  useEffect(() => {
    if (isConditionRed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Auto-dismiss after 4 seconds
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View 
      entering={FadeIn} 
      exiting={FadeOut} 
      style={styles.container}
    >
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onDismiss} 
        style={styles.content}
      >
        {/* Radar Rings */}
        <View style={styles.radarContainer}>
          <RadarCircle size={width * 0.8} color={isConditionRed ? '#EF4444' : '#10B981'} delay={0} />
          <RadarCircle size={width * 0.8} color={isConditionRed ? '#EF4444' : '#10B981'} delay={1000} />
          
          <View style={[styles.centralHub, isConditionRed && styles.hubRed]}>
             <Text style={styles.totalNumber}>{totalTasks}</Text>
             <Text style={styles.totalLabel}>MISSIONS</Text>
          </View>
        </View>

        {/* SITREP Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.condition, isConditionRed ? styles.textRed : styles.textGreen]}>
            {isConditionRed ? 'RED ZONE ACTIVE' : 'RADAR CLEAR'}
          </Text>
          <Text style={styles.description}>
            {isConditionRed 
              ? `${overdueCount} overdues detected. Clearing backlog first.` 
              : `${todayCount} tasks ready for today.`}
          </Text>
        </View>

        {/* Next Stop Banner */}
        {nextTask && (
          <Animated.View entering={SlideInDown.delay(400)} style={styles.bannerWrapper}>
            <BlurView intensity={20} tint="dark" style={styles.banner}>
               <View style={styles.bannerIcon}>
                 <MaterialIcons name="navigation" size={24} color="#FFF" />
               </View>
               <View style={styles.bannerText}>
                 <Text style={styles.bannerLabel}>PRIORITY 1</Text>
                 <Text style={styles.bannerAddress} numberOfLines={1}>
                   {nextTask.dropoff_location?.address || 'First Location'}
                 </Text>
               </View>
            </BlurView>
          </Animated.View>
        )}

        <Text style={styles.dismissHint}>Tap anywhere to skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    zIndex: 1000,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    width: width * 0.8,
    height: width * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(40),
  },
  centralHub: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: '#1E293B',
    borderWidth: 4,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowRadius: 20,
    shadowOpacity: 0.5,
    elevation: 10,
  },
  hubRed: {
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  totalNumber: {
    fontSize: normalizeFontSize(48),
    fontWeight: '900',
    color: '#FFF',
  },
  totalLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  condition: {
    fontSize: normalizeFontSize(24),
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: verticalScale(12),
  },
  textRed: { color: '#EF4444' },
  textGreen: { color: '#10B981' },
  description: {
    fontSize: normalizeFontSize(14),
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  bannerWrapper: {
    position: 'absolute',
    bottom: verticalScale(80),
    width: width - scale(40),
    borderRadius: 20,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bannerIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(16),
  },
  bannerText: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 1,
    marginBottom: 2,
  },
  bannerAddress: {
    fontSize: normalizeFontSize(16),
    fontWeight: '700',
    color: '#FFF',
  },
  dismissHint: {
    position: 'absolute',
    bottom: verticalScale(40),
    color: '#475569',
    fontSize: normalizeFontSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  }
});
```

---

### Task 2: Implement Logic & Visibility Manager

**Files:**
- Modify: `mobile-app/app/_layout.tsx`

- [.] **Step 1: Create visibility state**
Use `AppState` and `AsyncStorage` to determine when to show the briefing.

- [ ] **Step 2: Integrate with Auth and Data contexts**
Ensure the briefing only shows when a user is logged in and tasks are loaded.

```tsx
// Logic inside RootLayoutNav or similar
const [showBriefing, setShowBriefing] = useState(false);
const appState = useRef(AppState.currentState);

useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // Trigger briefing if logged in and task data available
      if (user && tasks.length > 0) {
        setShowBriefing(true);
      }
    }
    appState.current = nextAppState;
  });
  return () => subscription.remove();
}, [user, tasks]);
```

---

### Task 3: Final Polish & Safety Check

- [ ] **Step 1: Add "Seen" cooldown**
Add a 5-minute cooldown to `AsyncStorage` so it doesn't appear if they just flipped to another app for a second.

- [ ] **Step 2: Commit** (Skipping as per user request)

---

Plan complete and saved to `docs/superpowers/plans/2026-06-11-tactical-radar-briefing-impl.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
