import { describe, expect, it } from 'vitest';
import type { DeliveryRequest } from '../../types';
import { getActiveRouteSelection, isRouteReorderableTask, toggleActiveRouteSelection } from '../activeRouteSelection';

const task = (request_id: string, rider: string, delivery_status = 'assigned') => ({
  request_id,
  assigned_rider_id: rider,
  delivery_status,
  status: 'approved',
} as unknown as DeliveryRequest);

describe('active route selection', () => {
  it('requires selected active tasks from one rider and returns that rider full active queue', () => {
    const requests = [
      task('rider-a-1', 'rider-a'),
      task('rider-a-2', 'rider-a'),
      task('rider-b-1', 'rider-b'),
    ];

    expect(getActiveRouteSelection(requests, ['rider-a-1'])).toEqual({
      riderId: 'rider-a',
      requests: [requests[0], requests[1]],
    });
  });

  it('rejects mixed-rider and stale selections', () => {
    const requests = [task('rider-a-1', 'rider-a'), task('rider-b-1', 'rider-b')];

    expect(getActiveRouteSelection(requests, ['rider-a-1', 'rider-b-1'])).toBeNull();
    expect(getActiveRouteSelection(requests, ['missing-task'])).toBeNull();
  });

  it('blocks adding a task from a different rider and reports the blocked selection', () => {
    const requests = [task('rider-a-1', 'rider-a'), task('rider-b-1', 'rider-b')];

    expect(toggleActiveRouteSelection(requests, ['rider-a-1'], 'rider-b-1')).toEqual({
      selectedIds: ['rider-a-1'],
      blocked: true,
    });
  });

  it('does not allow started tasks to be selected for reordering', () => {
    for (const status of ['in_progress', 'arrived', 'picked_up', 'arrived_at_pickup', 'arrived_at_dropoff']) {
      expect(isRouteReorderableTask(task(status, 'rider-a', status))).toBe(false);
    }
    expect(isRouteReorderableTask(task('queued', 'rider-a'))).toBe(true);
  });
});
