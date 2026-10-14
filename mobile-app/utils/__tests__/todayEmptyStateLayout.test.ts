import {
  getTodayEmptyStateTopPadding,
  getTodayRoadArtworkBottomOffset,
  getTodayRoadArtworkHeight,
} from '../todayEmptyStateLayout';

describe('getTodayEmptyStateTopPadding', () => {
  it('keeps the empty state compact on short screens', () => {
    expect(getTodayEmptyStateTopPadding(568)).toBe(20);
  });

  it('moves the empty state down as taller screens expose more unused space', () => {
    expect(getTodayEmptyStateTopPadding(700)).toBe(68);
    expect(getTodayEmptyStateTopPadding(890)).toBe(132);
  });
});

describe('getTodayRoadArtworkHeight', () => {
  it('preserves the full landscape artwork ratio at common phone widths', () => {
    expect(getTodayRoadArtworkHeight(320)).toBe(107);
    expect(getTodayRoadArtworkHeight(390)).toBe(130);
    expect(getTodayRoadArtworkHeight(430)).toBe(143);
  });
});

describe('getTodayRoadArtworkBottomOffset', () => {
  it('positions the artwork just above the navigation for common safe areas', () => {
    expect(getTodayRoadArtworkBottomOffset(0)).toBe(104);
    expect(getTodayRoadArtworkBottomOffset(34)).toBe(138);
  });
});
