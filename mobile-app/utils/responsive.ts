import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Based on standard ~5" screen mobile device (e.g. iPhone 11 Pro / standard Android dimensions)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

/**
 * Scales a value based on the screen width. Useful for:
 * widths, margins, paddings, and border radii.
 */
export const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scales a value based on the screen height. Useful for:
 * heights, vertical margins, and vertical paddings.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderately scales a value based on the screen width.
 * The factor (default 0.5) controls how much it scales.
 * Useful for making elements slightly larger on big screens,
 * but not overly massive.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Normalizes font sizes based on device PixelRatio and screen width,
 * ensuring text is readable on very small or very large Android phones.
 */
export function normalizeFontSize(size: number) {
  const newSize = size * (SCREEN_WIDTH / guidelineBaseWidth);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
}

// Export screen dimensions for convenience
export { SCREEN_WIDTH as width, SCREEN_HEIGHT as height };
