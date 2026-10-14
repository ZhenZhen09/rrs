import { describe, expect, it } from 'vitest';
import { appendIncomingTasks, validateQueueReplacement } from '../riderQueue';

describe('rider queue invariants', () => {
  it('appends newly assigned work after the existing rider queue', () => {
    expect(appendIncomingTasks(['old-1', 'old-2'], ['new-1', 'new-2']))
      .toEqual(['old-1', 'old-2', 'new-1', 'new-2']);
  });

  it('keeps the chosen order within the incoming batch', () => {
    expect(appendIncomingTasks(['old-1'], ['new-1', 'new-2'], ['new-2', 'new-1']))
      .toEqual(['old-1', 'new-2', 'new-1']);
  });

  it.each([
    [['a', 'b'], ['a', 'a']],
    [['a', 'b'], ['a']],
    [['a', 'b'], ['a', 'b', 'foreign']],
  ])('rejects a replacement that is not an exact queue permutation', (currentIds, submittedIds) => {
    expect(() => validateQueueReplacement(
      currentIds.map((request_id) => ({ request_id, delivery_status: 'assigned', queue_order: null })),
      submittedIds,
    )).toThrow();
  });

  it.each(['in_progress', 'arrived', 'picked_up', 'arrived_at_pickup', 'arrived_at_dropoff'])(
    'keeps %s work ahead of unstarted tasks', (delivery_status) => {
      expect(() => validateQueueReplacement([
        { request_id: 'started', delivery_status, queue_order: 1 },
        { request_id: 'waiting', delivery_status: 'assigned', queue_order: 2 },
      ], ['waiting', 'started'])).toThrow();
    },
  );
});
