import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTodayRoadArtworkBottomOffset, getTodayRoadArtworkHeight } from '@/utils/todayEmptyStateLayout';

export function TodayRoadBackdrop() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="today-road-backdrop"
      pointerEvents="none"
      style={[styles.container, { bottom: getTodayRoadArtworkBottomOffset(insets.bottom) }]}
    >
      <Image
        accessible={false}
        source={require('../../assets/images/misty-blue-hills-road.png')}
        resizeMode="contain"
        style={[styles.image, { height: getTodayRoadArtworkHeight(screenWidth) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    opacity: 0.9,
  },
});
