import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { ensureWebPushTable, getWebPushPublicKey, getWebPushSubscriptionCount, hasWebPushSubscription, removeWebPushSubscription, saveWebPushSubscription } = vi.hoisted(() => ({
  ensureWebPushTable: vi.fn(),
  getWebPushPublicKey: vi.fn(() => 'public-vapid-key'),
  getWebPushSubscriptionCount: vi.fn(),
  hasWebPushSubscription: vi.fn(),
  removeWebPushSubscription: vi.fn(),
  saveWebPushSubscription: vi.fn(),
}));

vi.mock('../../db', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../services/webPush', () => ({
  ensureWebPushTable, getWebPushPublicKey, getWebPushSubscriptionCount,
  hasWebPushSubscription, removeWebPushSubscription, saveWebPushSubscription,
}));
vi.mock('expo-server-sdk', () => ({ Expo: class { static isExpoPushToken() { return false; } } }));

import notificationRoutes from '../notifications';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.user = { id: String(req.headers['x-user'] || 'staff-1'), role: String(req.headers['x-role'] || 'personnel') };
  next();
});
app.use('/api/notifications', notificationRoutes);

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-secret',
  keys: { p256dh: 'p256dh-secret', auth: 'auth-secret' },
};

describe('staff web-push subscription APIs', () => {
  beforeEach(() => {
    ensureWebPushTable.mockReset().mockResolvedValue(undefined);
    getWebPushPublicKey.mockReturnValue('public-vapid-key');
    getWebPushSubscriptionCount.mockReset().mockResolvedValue(1);
    hasWebPushSubscription.mockReset().mockResolvedValue(true);
    removeWebPushSubscription.mockReset().mockResolvedValue(undefined);
    saveWebPushSubscription.mockReset().mockResolvedValue(undefined);
  });

  it.each(['rider', 'dispatcher'])('rejects %s status, registration, and deletion before subscription access', async (role) => {
    const status = await request(app).get('/api/notifications/web-push/status').set('x-role', role);
    const subscribe = await request(app).post('/api/notifications/web-push/subscribe').set('x-role', role).send({ subscription });
    const remove = await request(app).delete('/api/notifications/web-push/subscribe').set('x-role', role).send({ endpoint: subscription.endpoint });

    expect([status.status, subscribe.status, remove.status]).toEqual([403, 403, 403]);
    expect(getWebPushSubscriptionCount).not.toHaveBeenCalled();
    expect(saveWebPushSubscription).not.toHaveBeenCalled();
    expect(removeWebPushSubscription).not.toHaveBeenCalled();
  });

  it.each(['admin', 'personnel'])('allows %s to register an idempotent subscription without returning secrets', async (role) => {
    const response = await request(app).post('/api/notifications/web-push/subscribe')
      .set('x-role', role).set('x-user', `${role}-42`).set('user-agent', 'test-agent').send({ subscription });

    expect(response.status).toBe(200);
    expect(saveWebPushSubscription).toHaveBeenCalledWith(`${role}-42`, subscription, 'test-agent');
    expect(JSON.stringify(response.body)).not.toMatch(/endpoint-secret|p256dh-secret|auth-secret/);
  });

  it.each([
    'https://127.0.0.1/internal',
    'https://localhost/push',
    'https://fcm.googleapis.com.attacker.example/push',
    'https://attacker.example/push',
    'https://fcm.googleapis.com:8443/push',
  ])('rejects unsafe push endpoint host %s', async (endpoint) => {
    const response = await request(app).post('/api/notifications/web-push/subscribe')
      .send({ subscription: { ...subscription, endpoint } });
    expect(response.status).toBe(400);
    expect(saveWebPushSubscription).not.toHaveBeenCalled();
  });

  it('scopes status and endpoint deletion to the signed-in user', async () => {
    const status = await request(app).post('/api/notifications/web-push/status')
      .set('x-user', 'personnel-7').send({ endpoint: subscription.endpoint });
    const remove = await request(app).delete('/api/notifications/web-push/subscribe')
      .set('x-user', 'personnel-7').send({ endpoint: subscription.endpoint });

    expect(status.body).toEqual({ enabled: true, subscribed: true });
    expect(hasWebPushSubscription).toHaveBeenCalledWith('personnel-7', subscription.endpoint);
    expect(removeWebPushSubscription).toHaveBeenCalledWith('personnel-7', subscription.endpoint);
    expect(JSON.stringify(status.body)).not.toMatch(/endpoint-secret|p256dh-secret|auth-secret|private-vapid/);
  });

  it('reports the current browser as unsubscribed when it has no local endpoint', async () => {
    hasWebPushSubscription.mockResolvedValueOnce(false);
    const response = await request(app).post('/api/notifications/web-push/status')
      .set('x-user', 'personnel-7').send({ endpoint: null });

    expect(response.body).toEqual({ enabled: true, subscribed: false });
    expect(hasWebPushSubscription).not.toHaveBeenCalled();
  });

  it('returns only the public VAPID key from the config endpoint', async () => {
    const response = await request(app).get('/api/notifications/web-push/config');

    expect(response.body).toEqual({ enabled: true, publicKey: 'public-vapid-key' });
    expect(JSON.stringify(response.body)).not.toContain('private');
  });
});
