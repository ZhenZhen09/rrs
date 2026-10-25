import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const messaging = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getOrCreateRequestConversation: vi.fn(),
  listMessages: vi.fn(),
  createMessage: vi.fn(),
  markConversationRead: vi.fn(),
  listConversationDeliveryTargets: vi.fn(),
}));

vi.mock('../../services/messaging', () => messaging);
vi.mock('../../db', () => ({ pool: { query: vi.fn().mockResolvedValue([[], []]) } }));
vi.mock('../../routes/notifications', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const [id, role] = String(req.headers['x-test-user'] || 'admin-1:admin').split(':');
    req.user = { id, role, email: `${id}@test.local` };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  },
}));

import { authenticate } from '../../middleware/auth';
import conversationsRoutes from '../conversations';
import { sendPushNotification } from '../notifications';

const emitted: Array<{ rooms: string[]; event: string; payload: any }> = [];
const emit = vi.fn((rooms: string[], event: string, payload: any) => {
  emitted.push({ rooms, event, payload });
});
const io = {
  to: vi.fn((rooms: string | string[]) => ({
    emit: (event: string, payload: any) => emit(Array.isArray(rooms) ? rooms : [rooms], event, payload),
  })),
};
const savedMessage = {
  id: 'msg-live', conversationId: 'conv-1',
  sender: { id: 'rider-1', name: 'Rider', role: 'rider' },
  clientMessageId: '11111111-1111-4111-8111-111111111111',
  body: 'reply', createdAt: '2026-10-03 10:00:00.000000', readAt: null,
};
const sendBody = { clientMessageId: savedMessage.clientMessageId, body: savedMessage.body };

const app = express();
app.set('io', io);
app.use(express.json());
app.use('/api/conversations', authenticate, conversationsRoutes);
app.use('/api/requests', authenticate, conversationsRoutes);

describe('conversation REST routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    emitted.length = 0;
    emit.mockImplementation((rooms, event, payload) => { emitted.push({ rooms, event, payload }); });
    io.to.mockImplementation((rooms) => ({
      emit: (event, payload) => emit(Array.isArray(rooms) ? rooms : [rooms], event, payload),
    }));
    messaging.listConversationDeliveryTargets.mockResolvedValue([
      { userId: 'admin-1', requestId: 'req-1' },
      { userId: 'rider-1', requestId: 'req-1' },
    ]);
    vi.mocked(sendPushNotification).mockResolvedValue({ sent: true });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it.each(['admin-1:admin', 'rider-1:rider'])('fans out %s through one authorized user-room union and pushes only peers', async (actor) => {
    messaging.createMessage.mockResolvedValue(savedMessage);
    const response = await request(app).post('/api/conversations/conv-1/messages').set('x-test-user', actor).send(sendBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(savedMessage);
    expect(emitted).toEqual([
      { rooms: ['admin-1', 'rider-1'], event: 'conversation-message', payload: { conversationId: 'conv-1', message: savedMessage } },
      { rooms: ['admin-1', 'rider-1'], event: 'conversation-updated', payload: { conversationId: 'conv-1', lastMessage: savedMessage } },
    ]);
    const actorId = actor.split(':')[0];
    expect(messaging.listConversationDeliveryTargets).toHaveBeenCalledWith('conv-1', actorId);
    expect(sendPushNotification).toHaveBeenCalledExactlyOnceWith(
      actorId === 'admin-1' ? 'rider-1' : 'admin-1', 'New message', 'You have a new conversation message.',
      { type: 'conversation_message', conversationId: 'conv-1', messageId: 'msg-live', requestId: 'req-1' },
    );
  });

  it('emits one authorized read receipt and no conversation-updated event', async () => {
    const result = { readAt: '2026-10-03 10:00:00.000000' };
    messaging.markConversationRead.mockResolvedValue(result);
    const response = await request(app).put('/api/conversations/conv-1/read').set('x-test-user', 'rider-1:rider');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(emitted).toEqual([{
      rooms: ['admin-1', 'rider-1'], event: 'conversation-read',
      payload: { conversationId: 'conv-1', userId: 'rider-1', ...result },
    }]);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it.each(['message', 'read'])('waits for %s persistence before looking up targets or emitting', async (operation) => {
    let persist!: (value: any) => void;
    let started!: () => void;
    const persistenceStarted = new Promise<void>(resolve => { started = resolve; });
    const durableResult = operation === 'message' ? savedMessage : { readAt: 'saved-read' };
    const service = operation === 'message' ? messaging.createMessage : messaging.markConversationRead;
    service.mockImplementation(() => {
      started();
      return new Promise(resolve => { persist = resolve; });
    });
    const pending = (operation === 'message'
      ? request(app).post('/api/conversations/conv-1/messages').send(sendBody)
      : request(app).put('/api/conversations/conv-1/read')).then(response => response);
    await persistenceStarted;
    expect(emitted).toEqual([]);
    expect(messaging.listConversationDeliveryTargets).not.toHaveBeenCalled();
    expect(sendPushNotification).not.toHaveBeenCalled();
    persist(durableResult);
    const response = await pending;
    expect(response.status).toBe(operation === 'message' ? 201 : 200);
    expect(response.body).toEqual(durableResult);
    expect(emitted.map(item => item.event)).toEqual(operation === 'message'
      ? ['conversation-message', 'conversation-updated'] : ['conversation-read']);
  });

  it.each(['message', 'read'])('emits nothing when %s persistence fails', async (operation) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    messaging.createMessage.mockRejectedValue(new Error('database unavailable'));
    messaging.markConversationRead.mockRejectedValue(new Error('database unavailable'));
    const response = operation === 'message'
      ? await request(app).post('/api/conversations/conv-1/messages').send(sendBody)
      : await request(app).put('/api/conversations/conv-1/read');

    expect(response.status).toBe(500);
    expect(emitted).toEqual([]);
    expect(messaging.listConversationDeliveryTargets).not.toHaveBeenCalled();
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it.each(['message', 'read'])('returns saved %s after target lookup fails without fallback or sensitive logging', async (operation) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    messaging.createMessage.mockResolvedValue(savedMessage);
    messaging.markConversationRead.mockResolvedValue({ readAt: 'saved-read' });
    messaging.listConversationDeliveryTargets.mockRejectedValue(new Error('secret body token=password'));
    const response = operation === 'message'
      ? await request(app).post('/api/conversations/conv-1/messages').send(sendBody)
      : await request(app).put('/api/conversations/conv-1/read');

    expect(response.status).toBe(operation === 'message' ? 201 : 200);
    expect(response.body).toEqual(operation === 'message' ? savedMessage : { readAt: 'saved-read' });
    expect(emitted).toEqual([]);
    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalled();
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(/secret body|token=password/);
  });

  it.each(['message', 'read'])('returns saved %s after socket delivery throws', async (operation) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    messaging.createMessage.mockResolvedValue(savedMessage);
    messaging.markConversationRead.mockResolvedValue({ readAt: 'saved-read' });
    emit.mockImplementation(() => { throw new Error('secret socket token'); });
    const response = operation === 'message'
      ? await request(app).post('/api/conversations/conv-1/messages').send(sendBody)
      : await request(app).put('/api/conversations/conv-1/read');

    expect(response.status).toBe(operation === 'message' ? 201 : 200);
    expect(response.body).toEqual(operation === 'message' ? savedMessage : { readAt: 'saved-read' });
    expect(warning).toHaveBeenCalled();
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret socket token');
    if (operation === 'message') expect(sendPushNotification).toHaveBeenCalledOnce();
  });

  it('keeps push failure logging sanitized and still broadcasts the durable message', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    messaging.createMessage.mockResolvedValue(savedMessage);
    vi.mocked(sendPushNotification).mockRejectedValueOnce(new Error('secret push token'));
    const response = await request(app).post('/api/conversations/conv-1/messages').send(sendBody);
    expect(response.status).toBe(201);
    expect(emitted.filter(item => item.event === 'conversation-message')).toHaveLength(1);
    expect(sendPushNotification).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalled();
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret push token');
  });

  it('sends no events or pushes when no authorized targets remain', async () => {
    messaging.createMessage.mockResolvedValue(savedMessage);
    messaging.listConversationDeliveryTargets.mockResolvedValue([]);
    const response = await request(app).post('/api/conversations/conv-1/messages').send(sendBody);
    expect(response.status).toBe(201);
    expect(emitted).toEqual([]);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('lists the authenticated actor inbox with cursor and bounded limit', async () => {
    messaging.listConversations.mockResolvedValue({ conversations: [], nextCursor: null });

    const response = await request(app)
      .get('/api/conversations?cursor=next-page&limit=20')
      .set('x-test-user', 'admin-1:admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversations: [], nextCursor: null });
    expect(messaging.listConversations).toHaveBeenCalledWith('admin-1', 'next-page', 20);
  });

  it('rejects personnel and client-supplied participant identity', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .set('x-test-user', 'personnel-1:personnel')
      .send({ requestId: 'req-1', riderId: 'attacker', actorId: 'attacker' });

    expect(response.status).toBe(403);
    expect(messaging.getOrCreateRequestConversation).not.toHaveBeenCalled();
  });

  it('resolves a request conversation using only the authenticated actor', async () => {
    messaging.getOrCreateRequestConversation.mockResolvedValue({ id: 'conv-1', requestId: 'req-1' });

    const response = await request(app)
      .post('/api/conversations')
      .set('x-test-user', 'rider-1:rider')
      .send({ requestId: 'req-1' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('conv-1');
    expect(messaging.getOrCreateRequestConversation).toHaveBeenCalledWith('req-1', 'rider-1');
  });

  it('forwards message pagination and uses the authenticated actor for sends and reads', async () => {
    messaging.listMessages.mockResolvedValue({ messages: [], nextCursor: 'older' });
    messaging.createMessage.mockResolvedValue({ id: 'msg-1', body: 'hello' });
    messaging.markConversationRead.mockResolvedValue({ readAt: '2026-10-02 10:00:00.000000' });

    const page = await request(app).get('/api/conversations/conv-1/messages?before=cursor&limit=5').set('x-test-user', 'rider-1:rider');
    const sent = await request(app).post('/api/conversations/conv-1/messages').set('x-test-user', 'rider-1:rider').send({
      clientMessageId: '11111111-1111-4111-8111-111111111111', body: 'hello',
    });
    const read = await request(app).put('/api/conversations/conv-1/read').set('x-test-user', 'rider-1:rider').send({ actorId: 'admin-1' });

    expect(page.status).toBe(200);
    expect(sent.status).toBe(201);
    expect(read.status).toBe(200);
    expect(messaging.listMessages).toHaveBeenCalledWith('conv-1', 'rider-1', 'cursor', 5);
    expect(messaging.createMessage).toHaveBeenCalledWith('rider-1', {
      conversationId: 'conv-1', clientMessageId: '11111111-1111-4111-8111-111111111111', body: 'hello',
    });
    expect(messaging.markConversationRead).toHaveBeenCalledWith('conv-1', 'rider-1');
  });

  it('rejects invalid message bodies and client IDs before calling the service', async () => {
    const response = await request(app)
      .post('/api/conversations/conv-1/messages')
      .set('x-test-user', 'admin-1:admin')
      .send({ clientMessageId: 'not-a-uuid', body: '   ' });

    expect(response.status).toBe(400);
    expect(messaging.createMessage).not.toHaveBeenCalled();
  });

  it('returns the saved message when push delivery fails after persistence', async () => {
    messaging.createMessage.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      clientMessageId: '11111111-1111-4111-8111-111111111111',
      body: 'hello',
    });
    const notifications = await import('../../routes/notifications');
    vi.mocked(notifications.sendPushNotification).mockRejectedValueOnce(new Error('push unavailable'));

    const response = await request(app)
      .post('/api/conversations/conv-1/messages')
      .set('x-test-user', 'rider-1:rider')
      .send({ clientMessageId: '11111111-1111-4111-8111-111111111111', body: 'hello' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('msg-1');
  });

  it('returns retry timing for a rate-limited user without sharing the limit across users', async () => {
    messaging.createMessage.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      clientMessageId: '11111111-1111-4111-8111-111111111111',
      body: 'hello',
    });
    const payload = {
      clientMessageId: '11111111-1111-4111-8111-111111111111',
      body: 'hello',
    };

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await request(app)
        .post('/api/conversations/conv-rate/messages')
        .set('x-test-user', 'rate-limited:rider')
        .send(payload);
      expect(response.status).toBe(201);
    }

    const limited = await request(app)
      .post('/api/conversations/conv-rate/messages')
      .set('x-test-user', 'rate-limited:rider')
      .send(payload);
    const otherUser = await request(app)
      .post('/api/conversations/conv-rate/messages')
      .set('x-test-user', 'independent:rider')
      .send(payload);

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many messages. Please try again later.' });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(otherUser.status).toBe(201);
  });
});
