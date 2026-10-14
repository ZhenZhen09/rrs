import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, connectionQuery, connection } = vi.hoisted(() => {
  const connectionQuery = vi.fn();
  const connection = {
    query: connectionQuery,
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
  return { query: vi.fn(), connectionQuery, connection };
});

vi.mock('../../db', () => ({ pool: { query, getConnection: vi.fn(async () => connection) } }));
vi.mock('web-push', () => ({ default: { sendNotification: vi.fn(), setVapidDetails: vi.fn() } }));

import { enqueueWebPush, isEligibleWebPush, reconcileUnqueuedWebPushNotifications } from '../webPushQueue';

describe('web push queue eligibility', () => {
  beforeEach(() => query.mockReset().mockResolvedValue([{ affectedRows: 1 }, []]));

  it('allows exactly the approved staff role and event combinations', () => {
    expect(isEligibleWebPush('admin', 'request_submitted')).toBe(true);
    expect(isEligibleWebPush('admin', 'assignment_cancelled')).toBe(true);
    expect(isEligibleWebPush('admin', 'deviation_requested')).toBe(true);
    expect(isEligibleWebPush('personnel', 'request_approved')).toBe(true);
    expect(isEligibleWebPush('personnel', 'request_disapproved')).toBe(true);
    expect(isEligibleWebPush('personnel', 'request_revision')).toBe(true);
    expect(isEligibleWebPush('personnel', 'request_cancelled')).toBe(true);
    expect(isEligibleWebPush('rider', 'request_approved')).toBe(false);
    expect(isEligibleWebPush('admin', 'request_approved')).toBe(false);
    expect(isEligibleWebPush('personnel', 'deviation_requested')).toBe(false);
    expect(isEligibleWebPush('admin', 'new_assignment')).toBe(false);
  });

  it('queues only an eligible saved notification and deduplicates by notification id', async () => {
    query.mockImplementation(async (sql: string) => String(sql || '').includes('FROM notifications n')
      ? [[{ id: 'notif-1', user_id: 'admin-1', type: 'request_submitted', request_id: 'req-1', role: 'admin' }], []]
      : [{ affectedRows: 1 }, []]);

    await enqueueWebPush('notif-1');

    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM notifications n'), ['notif-1']);
    const notificationLookup = query.mock.calls.find(([sql]) => String(sql).includes('FROM notifications n'))?.[0];
    expect(String(notificationLookup)).toContain('n.user_id COLLATE utf8mb4_unicode_ci = u.id');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT IGNORE INTO web_push_queue'), [
      'notif-1', 'admin-1', 'admin', 'request_submitted', 'req-1',
    ]);
  });

  it('does not create work for an ineligible notification', async () => {
    query.mockImplementation(async (sql: string) => String(sql || '').includes('FROM notifications n')
      ? [[{ id: 'notif-2', user_id: 'personnel-1', type: 'deviation_requested', request_id: 'req-2', role: 'personnel' }], []]
      : [{ affectedRows: 1 }, []]);

    await enqueueWebPush('notif-2');

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reconciles eligible saved notifications that failed their first enqueue attempt', async () => {
    query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('LEFT JOIN web_push_queue')) {
        expect(String(sql)).toContain('n.created_at >= state.reconcile_after');
        return [[{ id: 'notif-retry' }], []];
      }
      if (String(sql).includes('FROM notifications n')) return [[{
        id: 'notif-retry', user_id: 'staff-1', type: 'request_approved', request_id: 'req-1', role: 'personnel',
      }], []];
      return [{ affectedRows: 1 }, []];
    });

    await expect(reconcileUnqueuedWebPushNotifications()).resolves.toBe(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT IGNORE INTO web_push_queue'), [
      'notif-retry', 'staff-1', 'personnel', 'request_approved', 'req-1',
    ]);
  });

  it('uses an explicit collation when matching notification IDs to queue IDs', async () => {
    query.mockResolvedValue([[], []]);
    await reconcileUnqueuedWebPushNotifications();

    const reconcileQuery = query.mock.calls.find(([sql]) => String(sql).includes('LEFT JOIN web_push_queue'))?.[0];
    expect(String(reconcileQuery)).toContain('q.notification_id = n.id COLLATE utf8mb4_unicode_ci');
    expect(String(reconcileQuery)).toContain('n.user_id COLLATE utf8mb4_unicode_ci = u.id');
  });
});
