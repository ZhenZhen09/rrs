export type TrackingOpenMode = 'embedded' | 'new-tab';

export const getTrackingOpenMode = (isMobileViewport: boolean): TrackingOpenMode =>
  isMobileViewport ? 'embedded' : 'new-tab';
