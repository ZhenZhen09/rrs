import { describe, expect, it, vi } from 'vitest';
import { isPermanentFcmTokenError, sendFcmNotification } from '../fcm';

describe('Firebase Cloud Messaging sender', () => {
  it('sends a visible high-priority rider alert with string routing data', async () => {
    const send = vi.fn().mockResolvedValue('firebase-message-id');

    await sendFcmNotification('device-token', {
      title: 'New delivery task',
      body: 'A task was assigned.',
      data: { request_id: 'job-1', notificationId: 'notif-1', location: { lat: 1 } },
      channelId: 'delivery_updates',
      tag: 'delivery:job-1:assignment',
      priority: 'high',
    }, { send } as any);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      token: 'device-token',
      notification: { title: 'New delivery task', body: 'A task was assigned.' },
      data: { request_id: 'job-1', notificationId: 'notif-1', location: '{"lat":1}' },
      android: expect.objectContaining({
        priority: 'high',
        notification: expect.objectContaining({ channelId: 'delivery_updates', tag: 'delivery:job-1:assignment' }),
      }),
      apns: expect.objectContaining({ headers: { 'apns-priority': '10' } }),
    }));
  });

  it('recognizes permanently invalid FCM registration tokens', () => {
    expect(isPermanentFcmTokenError({ code: 'messaging/registration-token-not-registered' })).toBe(true);
    expect(isPermanentFcmTokenError({ code: 'messaging/invalid-registration-token' })).toBe(true);
    expect(isPermanentFcmTokenError({ code: 'messaging/server-unavailable' })).toBe(false);
  });
});
