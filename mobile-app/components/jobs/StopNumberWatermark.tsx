import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale, normalizeFontSize } from '@/utils/responsive';

type StopNumberWatermarkProps = {
  sequenceLabel: string;
};

export function StopNumberWatermark({ sequenceLabel }: StopNumberWatermarkProps) {
  const stopNumber = sequenceLabel.match(/^STOP\s+(\d+)/i)?.[1] || '1';

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.watermark}
    >
      <View style={styles.routeMark}>
        <View style={styles.routeDot} />
        <View style={styles.routeLine} />
        <View style={styles.routeDot} />
      </View>
      <View style={styles.numberBlock}>
        <Text style={styles.stopLabel}>STOP</Text>
        <Text
          style={[styles.stopNumber, stopNumber.length > 2 && styles.longStopNumber]}
          maxFontSizeMultiplier={1.2}
        >
          {stopNumber.padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    right: moderateScale(14),
    top: '50%',
    height: moderateScale(76),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    opacity: 0.82,
    transform: [{ translateY: -moderateScale(38) }],
  },
  routeMark: {
    height: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    backgroundColor: '#94A3B8',
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: moderateScale(2),
    backgroundColor: '#CBD5E1',
  },
  numberBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stopLabel: {
    color: '#64748B',
    fontSize: normalizeFontSize(8),
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  stopNumber: {
    color: '#94A3B8',
    fontSize: normalizeFontSize(58),
    lineHeight: normalizeFontSize(62),
    fontWeight: '900',
    letterSpacing: -2,
  },
  longStopNumber: { fontSize: normalizeFontSize(42), lineHeight: normalizeFontSize(48), letterSpacing: -1 },
});
