import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { query, pushSend, sendFcm } = vi.hoisted(() => ({ query: vi.fn(), pushSend: vi.fn(), sendFcm: vi.fn() }));
vi.mock('../../db', () => ({ pool: { query } }));
vi.mock('../../services/fcm', () => ({
  sendFcmNotification: sendFcm,
  isPermanentFcmTokenError: (error: any) => [
    'messaging/registration-token-not-registered', 'messaging/invalid-registration-token',
  ].includes(error?.code),
}));
vi.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken(token: string) { return token.startsWith('ExpoPushToken['); }
    chunkPushNotifications(messages: unknown[]) { return [messages]; }
    async sendPushNotificationsAsync(...args: any[]) { return pushSend(...args); }
  },
}));

import notificationRoutes from '../notifications';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.user = { id: 'actor-1', role: req.headers['x-role'] || 'rider' };
  next();
});
app.use('/api/notifications', notificationRoutes);

describe('notification creation authorization', () => {
  beforeEach(() => {
    query.mockReset().mockResolvedValue([[], []]);
    pushSend.mockReset().mockResolvedValue([]);
    sendFcm.mockReset().mockResolvedValue(undefined);
  });

  it('rejects cross-user notification creation by ordinary accounts before database access', async () => {
    const response = await request(app).post('/api/notifications').send({
      user_id: 'victim', message: 'hello', type: 'info',
    });
    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects malformed admin notification payloads before database access', async () => {
    const response = await request(app).post('/api/notifications').set('x-role', 'admin').send({
      user_id: 'victim', message: 'x'.repeat(501), type: 'made_up',
    });
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires a real recipient for admin notification creation', async () => {
    const response = await request(app).post('/api/notifications').set('x-role', 'admin').send({
      user_id: 'missing', message: 'hello', type: 'info',
    });
    expect(response.status).toBe(404);
    expect(query).toHaveBeenCalledOnce();
    expect(String(query.mock.calls[0][0])).toContain('SELECT id FROM users');
  });

  it('allows admins to create a valid notification for an existing user', async () => {
    query.mockResolvedValueOnce([[{ id: 'rider-1' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[{ expo_push_token: null }], []]);
    const response = await request(app).post('/api/notifications').set('x-role', 'admin').send({
      user_id: 'rider-1', message: 'New task', type: 'new_assignment', request_id: 'request-1',
    });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('does not send Expo push to personnel even if they have a push token', async () => {
    query.mockResolvedValueOnce([[{ expo_push_token: 'valid-token', role: 'personnel' }], []]);
    await (await import('../notifications')).sendPushNotification('personnel-1', 'Update', 'Request update');
    expect(pushSend).not.toHaveBeenCalled();
    expect(sendFcm).not.toHaveBeenCalled();
  });

  it('registers an FCM token only for the authenticated rider', async () => {
    const response = await request(app).post('/api/notifications/register-token').send({
      token: 'fcm-registration-token', provider: 'fcm', platform: 'android',
    });

    expect(response.status).toBe(200);
    expect(String(query.mock.calls[0][0])).toContain('fcm_token');
    expect(String(query.mock.calls[0][0])).toContain('expo_push_token = NULL');
    expect(query.mock.calls[0][1]).toEqual(['fcm-registration-token', 'actor-1']);
  });

  it('rejects FCM token registration for non-rider accounts', async () => {
    const response = await request(app).post('/api/notifications/register-token')
      .set('x-role', 'personnel')
      .send({ token: 'fcm-registration-token', provider: 'fcm', platform: 'android' });

    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('retains legacy Expo registration when the provider is omitted', async () => {
    const response = await request(app).post('/api/notifications/register-token').send({ token: 'ExpoPushToken[legacy]' });

    expect(response.status).toBe(200);
    expect(String(query.mock.calls[0][0])).toContain('expo_push_token');
    expect(query.mock.calls[0][1]).toEqual(['ExpoPushToken[legacy]', 'actor-1']);
  });

  it('unregisters only the authenticated rider FCM token', async () => {
    const response = await request(app).post('/api/notifications/unregister-token').send({ provider: 'fcm' });

    expect(response.status).toBe(200);
    expect(String(query.mock.calls[0][0])).toContain('fcm_token = NULL');
    expect(String(query.mock.calls[0][0])).toContain('expo_push_token = NULL');
    expect(query.mock.calls[0][1]).toEqual(['actor-1']);
  });

  it('prefers FCM and does not also send through Expo', async () => {
    query.mockResolvedValueOnce([[{
      fcm_token: 'fcm-token', expo_push_token: 'ExpoPushToken[legacy]', role: 'rider',
    }], []]);

    await (await import('../notifications')).sendPushNotification('rider-1', 'New task', 'Task assigned', { request_id: 'job-1' });

    expect(sendFcm).toHaveBeenCalledWith('fcm-token', expect.objectContaining({
      title: 'New task', body: 'Task assigned', data: expect.objectContaining({ request_id: 'job-1' }),
    }));
    expect(pushSend).not.toHaveBeenCalled();
  });

  it('uses the rider urgent channel for assignments and new conversation messages', async () => {
    query.mockResolvedValueOnce([[{ fcm_token: 'fcm-token', role: 'rider' }], []]);
    await (await import('../notifications')).sendPushNotification('rider-1', 'New task', 'Task assigned', {
      request_id: 'job-1', type: 'new_assignment',
    });

    expect(sendFcm).toHaveBeenCalledWith('fcm-token', expect.objectContaining({
      channelId: 'delivery_urgent', priority: 'high',
    }));
  });

  it('uses Expo only when the rider has no FCM token yet', async () => {
    query.mockResolvedValueOnce([[{
      fcm_token: null, expo_push_token: 'ExpoPushToken[legacy]', role: 'rider',
    }], []]);

    await (await import('../notifications')).sendPushNotification('rider-1', 'New task', 'Task assigned');

    expect(sendFcm).not.toHaveBeenCalled();
    expect(pushSend).toHaveBeenCalledOnce();
  });

  it('clears a permanently invalid FCM token and does not send the same alert twice', async () => {
    query.mockResolvedValueOnce([[{
      fcm_token: 'stale-fcm-token', expo_push_token: 'ExpoPushToken[legacy]', role: 'rider',
    }], []]);
    sendFcm.mockRejectedValueOnce({ code: 'messaging/registration-token-not-registered' });

    await (await import('../notifications')).sendPushNotification('rider-1', 'New task', 'Task assigned');

    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[1][0])).toContain('fcm_token = NULL');
    expect(query.mock.calls[1][1]).toEqual(['rider-1', 'stale-fcm-token']);
    expect(pushSend).not.toHaveBeenCalled();
  });

  it('does not block notification work when Firebase is temporarily unavailable', async () => {
    query.mockResolvedValueOnce([[{ fcm_token: 'fcm-token', role: 'rider' }], []]);
    sendFcm.mockRejectedValueOnce({ code: 'messaging/server-unavailable' });

    await expect((await import('../notifications')).sendPushNotification('rider-1', 'New task', 'Task assigned'))
      .resolves.toBeUndefined();

    expect(query).toHaveBeenCalledOnce();
    expect(pushSend).not.toHaveBeenCalled();
  });
});
