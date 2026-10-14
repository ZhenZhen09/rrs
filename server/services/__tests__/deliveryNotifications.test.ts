import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAdminDispatchNotifications, persistDeliveryNotification, publishDeliveryNotification } from '../deliveryNotifications';

const { enqueueWebPush } = vi.hoisted(() => ({ enqueueWebPush: vi.fn() }));
vi.mock('../webPushQueue', () => ({
  enqueueWebPush,
  isPotentialWebPushType: (type: string) => ['request_submitted', 'assignment_cancelled', 'deviation_requested', 'request_approved', 'request_disapproved', 'request_revision', 'request_cancelled'].includes(type),
}));

describe('delivery notification persistence', () => {
  beforeEach(() => enqueueWebPush.mockReset().mockResolvedValue(undefined));

  it('persists one row and returns the existing notification fields', async () => {
    const executor = { query: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
    const notification = await persistDeliveryNotification(executor, {
      recipientId: 'rider-1', requestId: 'delivery-1', type: 'new_assignment',
      message: 'New delivery task assigned.',
    });

    expect(executor.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining(['rider-1', 'New delivery task assigned.', 'new_assignment', 'delivery-1']),
    );
    expect(notification).toMatchObject({
      user_id: 'rider-1', request_id: 'delivery-1', type: 'new_assignment',
      message: 'New delivery task assigned.',
    });
  });

  it('persists Admin submission, assignment-cancellation, and deviation inbox rows for each Admin', async () => {
    const executor = { query: vi.fn() };
    const admins = [{ id: 'admin-1' }, { id: 'admin-2' }];
    const eventTypes = ['request_submitted', 'assignment_cancelled', 'deviation_requested'] as const;

    for (const type of eventTypes) {
      executor.query.mockReset()
        .mockResolvedValueOnce([admins, []])
        .mockResolvedValue([{ affectedRows: 1 }, []]);
      const notifications = await persistAdminDispatchNotifications(executor, {
        requestId: 'request-1', type, message: 'Dispatch event.',
      });

      expect(notifications).toHaveLength(2);
      expect(notifications.map((item) => item.user_id)).toEqual(['admin-1', 'admin-2']);
      expect(notifications.every((item) => item.type === type && item.request_id === 'request-1')).toBe(true);
      expect(executor.query).toHaveBeenCalledTimes(3);
    }
  });

  it('publishes the saved notification and optional push without inserting another row', async () => {
    const notification = {
      id: 'notif_1', user_id: 'rider-1', request_id: 'delivery-1',
      type: 'new_assignment', message: 'New delivery task assigned.',
    };
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) } as any;
    const sendPush = vi.fn().mockResolvedValue(undefined);

    await publishDeliveryNotification(io, notification, {
      push: { send: sendPush, title: 'New delivery', body: notification.message,
        data: { request_id: 'delivery-1', type: 'new_assignment' }, channelId: 'delivery_updates' },
    });

    expect(io.to).toHaveBeenCalledWith('rider-1');
    expect(emit).toHaveBeenCalledWith('notification-added', notification);
    expect(sendPush).toHaveBeenCalledWith('rider-1', 'New delivery', notification.message,
      { request_id: 'delivery-1', type: 'new_assignment', notificationId: 'notif_1' }, { channelId: 'delivery_updates', categoryId: undefined, tag: undefined });
    expect(enqueueWebPush).not.toHaveBeenCalled();
  });

  it('queues an eligible saved notification after publish without duplicating its inbox row', async () => {
    const notification = {
      id: 'notif_staff', user_id: 'personnel-1', request_id: 'request-1',
      type: 'request_approved', message: 'Your request was approved.',
    };
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) } as any;

    await publishDeliveryNotification(io, notification);

    expect(enqueueWebPush).toHaveBeenCalledTimes(1);
    expect(enqueueWebPush).toHaveBeenCalledWith('notif_staff');
  });

  it('keeps the inbox publish successful if durable web-push queueing fails', async () => {
    enqueueWebPush.mockRejectedValueOnce(new Error('queue unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const notification = {
      id: 'notif_staff', user_id: 'personnel-1', request_id: 'request-1',
      type: 'request_approved', message: 'Your request was approved.',
    };
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) } as any;

    await expect(publishDeliveryNotification(io, notification)).resolves.toBeUndefined();

    expect(emit).toHaveBeenCalledWith('notification-added', notification);
    expect(errorSpy).toHaveBeenCalledWith('[WEB PUSH] Queueing saved notification failed.');
    errorSpy.mockRestore();
  });
});
