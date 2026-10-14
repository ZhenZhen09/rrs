import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { getRouteEstimate, isValidPoint } from './routing';

describe('routing contracts', () => {
  it('validates coordinate points', () => {
    assert.equal(isValidPoint({ lat: 14.5995, lng: 120.9842 }), true);
    assert.equal(isValidPoint({ lat: 91, lng: 120.9842 }), false);
    assert.equal(isValidPoint({ lat: '14.5995', lng: 120.9842 }), false);
  });

  it('returns the OSRM estimate when the provider responds', async () => {
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ routes: [{ distance: 4_200, duration: 900 }] }),
    });

    try {
      const result = await getRouteEstimate(
        { lat: 14.5995, lng: 120.9842 },
        { lat: 14.6091, lng: 121.0223 },
      );
      assert.deepEqual(result.distanceMeters, 4_200);
      assert.deepEqual(result.durationSeconds, 900);
      assert.deepEqual(result.provider, 'osrm');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
