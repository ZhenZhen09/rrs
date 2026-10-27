import { getPushEventKey, invalidateRiderPushQueries } from '../pushNotificationEvents';

describe('rider push event helpers', () => {
  it('uses durable event identifiers to deduplicate push and socket delivery', () => {
    expect(getPushEventKey({ eventId: 'event-1', request_id: 'job-1' }, 'fallback')).toBe('event-1');
    expect(getPushEventKey({ notificationId: 'notif-1' })).toBe('notif-1');
    expect(getPushEventKey({}, 'native-message-1')).toBe('native-message-1');
  });

  it('refreshes the rider inbox, jobs, history, and affected job detail', () => {
    const invalidateQueries = jest.fn();

    invalidateRiderPushQueries({ invalidateQueries } as any, 'rider-1', { request_id: 'job-1' });

    expect(invalidateQueries.mock.calls.map(([query]) => query.queryKey)).toEqual([
      ['notifications', 'rider-1'],
      ['tasks', 'rider-1'],
      ['historyTasks', 'rider-1'],
      ['job', 'rider-1', 'job-1'],
    ]);
  });

  it('does not issue user-scoped invalidations before a rider is signed in', () => {
    const invalidateQueries = jest.fn();

    invalidateRiderPushQueries({ invalidateQueries } as any, undefined, { request_id: 'job-1' });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
