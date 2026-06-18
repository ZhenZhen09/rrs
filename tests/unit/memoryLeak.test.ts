import { describe, it, expect, beforeEach } from 'vitest';
import { pruneTrackingState, riderLatestState, requestLatestState, suspectRiderPoints, requestGeofenceState } from '../../server/locationTracking';

describe('Memory Leak Prevention: Tracking State Pruning', () => {
  beforeEach(() => {
    // Setup dummy data
    riderLatestState.clear();
    requestLatestState.clear();
    suspectRiderPoints.clear();
    requestGeofenceState.clear();

    riderLatestState.set('rider1', { latestDb: { lat: 1, lng: 1, timestamp: 1 } });
    riderLatestState.set('rider2', { latestDb: { lat: 2, lng: 2, timestamp: 2 } });
    
    suspectRiderPoints.set('rider1', { lat: 1, lng: 1, timestamp: 1 });
    suspectRiderPoints.set('rider2', { lat: 2, lng: 2, timestamp: 2 });

    requestLatestState.set('req1', { latestDb: { lat: 1, lng: 1, timestamp: 1 } });
    requestLatestState.set('req2', { latestDb: { lat: 2, lng: 2, timestamp: 2 } });

    requestGeofenceState.set('req1', { arrived_pickup: false, arrived_dropoff: false, last_active: 1, last_lat: 1, last_lng: 1 });
    requestGeofenceState.set('req2', { arrived_pickup: false, arrived_dropoff: false, last_active: 2, last_lat: 2, last_lng: 2 });
  });

  it('prunes terminal requests from memory maps', () => {
    // We prune 'req1'
    pruneTrackingState(['req1'], []);

    expect(requestLatestState.has('req1')).toBe(false);
    expect(requestGeofenceState.has('req1')).toBe(false);

    // Assert others are untouched
    expect(requestLatestState.has('req2')).toBe(true);
    expect(requestGeofenceState.has('req2')).toBe(true);
    expect(riderLatestState.has('rider1')).toBe(true);
  });

  it('prunes offline riders from memory maps', () => {
    // We prune 'rider1'
    pruneTrackingState([], ['rider1']);

    expect(riderLatestState.has('rider1')).toBe(false);
    expect(suspectRiderPoints.has('rider1')).toBe(false);

    // Assert others are untouched
    expect(riderLatestState.has('rider2')).toBe(true);
    expect(suspectRiderPoints.has('rider2')).toBe(true);
    expect(requestLatestState.has('req1')).toBe(true);
  });
});
