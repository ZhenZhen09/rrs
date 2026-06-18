import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RadarCircle } from './RadarCircle';
import { scale, verticalScale, normalizeFontSize } from '@/utils/responsive';
import { Job } from '@/types';

const { width } = Dimensions.get('window');

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
    
    // Auto-dismiss after 5 seconds to give enough time to read
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [isConditionRed, onDismiss]);

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
            <View style={styles.banner}>
               <View style={styles.bannerIcon}>
                 <MaterialIcons name="navigation" size={24} color="#FFF" />
               </View>
               <View style={styles.bannerText}>
                 <Text style={styles.bannerLabel}>PRIORITY 1</Text>
                 <Text style={styles.bannerAddress} numberOfLines={1}>
                   {nextTask.dropoff_location?.address || 'First Location'}
                 </Text>
               </View>
            </View>
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
    zIndex: 9999,
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
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
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
    fontSize: normalizeFontSize(56),
    fontWeight: '900',
    color: '#FFF',
  },
  totalLabel: {
    fontSize: normalizeFontSize(10),
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: -4,
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
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.7)', // Slate-800 with opacity
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(20),
  },
  bannerIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: 14,
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
