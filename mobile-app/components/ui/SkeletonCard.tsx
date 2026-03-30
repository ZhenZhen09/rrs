import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Card } from '@/components/ui/Card';
import { scale, verticalScale, moderateScale } from '@/utils/responsive';

export function SkeletonCard() {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <Card style={styles.card}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.header}>
          <View style={styles.timeBox} />
          <View style={styles.badgeBox} />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.iconBox} />
          <View style={styles.addressBox} />
        </View>
        
        <View style={styles.row}>
          <View style={styles.iconBox} />
          <View style={styles.nameBox} />
        </View>

        <View style={[styles.header, { marginTop: verticalScale(8), marginBottom: 0 }]}>
          <View style={styles.statusBox} />
          <View style={styles.actionBox} />
        </View>
      </Animated.View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: verticalScale(16),
    padding: moderateScale(16),
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: moderateScale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  timeBox: {
    width: '40%',
    height: verticalScale(20),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(6),
  },
  badgeBox: {
    width: scale(70),
    height: verticalScale(22),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(12),
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: verticalScale(12),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  iconBox: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    backgroundColor: '#E2E8F0',
    marginRight: scale(10),
  },
  addressBox: {
    width: '80%',
    height: verticalScale(16),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(6),
  },
  nameBox: {
    width: '60%',
    height: verticalScale(16),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(6),
  },
  statusBox: {
    width: '30%',
    height: verticalScale(14),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(4),
  },
  actionBox: {
    width: '25%',
    height: verticalScale(14),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(4),
  },
});
