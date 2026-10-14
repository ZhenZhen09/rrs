import { describe, expect, it } from 'vitest';
import { getRequestUpdateToast } from '../notificationMessages';

describe('request update notifications', () => {
  it('does not call a delivery status change an approval', () => {
    expect(getRequestUpdateToast({ request_id: 'req_123456', status: 'approved', delivery_status: 'in_progress' }))
      .toBe('Delivery #123456 is on the way.');
  });

  it('does not toast the actor for their own update', () => {
    expect(getRequestUpdateToast({ request_id: 'req_123456', delivery_status: 'in_progress', actor_role: 'rider' }, 'rider')).toBeNull();
  });
});
