import { describe, expect, it } from 'vitest';
import { ACCOUNTING_BUCKETS, buildRequestAccounting, getAccountingBucket } from '../requestAccounting';

describe('request accounting', () => {
  it('reconciles mixed legacy, terminal, revision and unknown records without double counting overdue', () => {
    const requests = [
      { status: 'pending' }, { status: 'submitted_waiting' },
      { status: 'approved', delivery_status: 'assigned', is_overdue: true },
      { status: 'returned_for_revision', delivery_status: 'assigned' },
      { status: 'approved', delivery_status: 'delivered' },
      { status: '', delivery_status: 'failed' },
      { status: 'cancelled', delivery_status: 'failed', is_overdue: true },
      { status: 'disapproved', delivery_status: 'pending' },
      { status: 'unexpected', delivery_status: null },
    ];
    const result = buildRequestAccounting(requests);
    expect(result).toMatchObject({ total: 9, pending: 2, active: 1, revision: 1,
      completed: 1, failed: 1, cancelled: 1, declined: 1, other: 1, done: 4, overdue: 1, difference: 0 });
    expect(ACCOUNTING_BUCKETS.reduce((sum, bucket) => sum + result[bucket], 0)).toBe(result.total);
  });

  it('keeps every status pair in exactly one primary bucket', () => {
    const statuses = [null, '', 'pending', 'approved', 'submitted_waiting', 'returned_for_revision', 'cancelled', 'disapproved', 'failed', 'delivered', 'custom'];
    const deliveries = [null, '', 'pending', 'assigned', 'in_progress', 'in_transit', 'picked_up', 'pending_review', 'completed', 'delivered', 'failed', 'cancelled', 'custom'];
    for (const status of statuses) for (const delivery_status of deliveries) {
      const request = { status, delivery_status };
      const result = buildRequestAccounting([request]);
      expect(ACCOUNTING_BUCKETS.filter(bucket => result[bucket] === 1)).toEqual([getAccountingBucket(request)]);
      expect(result.difference).toBe(0);
    }
  });

  it('normalizes status text and retains pending-review as active', () => {
    expect(getAccountingBucket({ status: ' APPROVED ', delivery_status: ' DELIVERED ' })).toBe('completed');
    expect(getAccountingBucket({ status: 'pending', delivery_status: 'pending_review' })).toBe('active');
    expect(getAccountingBucket({ status: 'returned_for_revision', delivery_status: 'in_progress' })).toBe('revision');
  });
});
