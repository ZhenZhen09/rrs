const BASE_TOP_PADDING = 20;
const MAX_TOP_PADDING = 132;
const REFERENCE_SCREEN_HEIGHT = 620;
const EXTRA_SPACE_RESPONSE = 0.6;

export const getTodayEmptyStateTopPadding = (screenHeight: number): number => {
  const responsivePadding = BASE_TOP_PADDING
    + Math.max(0, screenHeight - REFERENCE_SCREEN_HEIGHT) * EXTRA_SPACE_RESPONSE;

  return Math.round(Math.min(MAX_TOP_PADDING, responsivePadding));
};

export const getTodayRoadArtworkHeight = (screenWidth: number): number =>
  Math.round(screenWidth / 3);

export const getTodayRoadArtworkBottomOffset = (bottomInset: number): number =>
  100 + Math.max(0, bottomInset) + 4;
