import { describe, expect, it } from 'vitest';
import { getTrackingOpenMode } from '../trackingNavigation';

describe('tracking navigation', () => {
  it('uses an embedded view on mobile', () => {
    expect(getTrackingOpenMode(true)).toBe('embedded');
  });

  it('uses the dedicated tracking tab on desktop', () => {
    expect(getTrackingOpenMode(false)).toBe('new-tab');
  });
});
