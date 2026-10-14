import { describe, expect, it } from 'vitest';
import type { DeliveryRequest } from '../../types';
import { compareRiderQueue } from '../dispatchQueue';

const task = (request_id: string, rider: string, queue_order: number, delivery_date = '2026-10-08'): DeliveryRequest => ({
  request_id,
  assigned_rider_id: rider,
  queue_order,
  delivery_date,
} as DeliveryRequest);

describe('dispatch rider queue ordering', () => {
  it('groups by rider and orders by rank without treating rank as global', () => {
    const tasks = [task('a-2', 'rider-a', 2), task('b-1', 'rider-b', 1), task('a-1', 'rider-a', 1)];
    expect(tasks.sort(compareRiderQueue).map(({ request_id }) => request_id)).toEqual(['a-1', 'a-2', 'b-1']);
  });

  it('uses stable date, creation, and request ID tie breakers after queue rank', () => {
    const tasks = [task('later', 'rider-a', 1, '2026-10-09'), task('earlier', 'rider-a', 1, '2026-10-07')];
    expect(tasks.sort(compareRiderQueue).map(({ request_id }) => request_id)).toEqual(['earlier', 'later']);
  });
});
