import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import request from 'supertest';

const db = vi.hoisted(() => ({ query: vi.fn(), getConnection: vi.fn() }));
vi.mock('../../db', () => ({ pool: db }));
vi.mock('../notifications', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const [id, role] = String(req.headers['x-test-user'] || 'admin-1:admin').split(':');
    req.user = { id, role, email: `${id}@test.local` };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  },
}));

import { authenticate } from '../../middleware/auth';
import conversationsRoutes from '../conversations';

type RecordedEvent = { event: string; payload: any };
type Client = { socket: Socket; events: RecordedEvent[] };
const roles = new Map([
  ['admin-1', 'admin'], ['admin-2', 'admin'], ['rider-1', 'rider'],
  ['former-rider', 'rider'], ['demoted-admin', 'personnel'], ['outsider', 'rider'],
]);
const members = new Set(['admin-1', 'admin-2', 'rider-1', 'former-rider', 'demoted-admin']);

describe('messaging realtime over isolated HTTP and Socket.IO', () => {
  let http: HttpServer;
  let io: Server;
  let url: string;
  let clients: Client[];
  let rows: any[];
  let assignedRider: string;
  let failPersistence: boolean;
  let failLookup: boolean;
  let currentRoles: Map<string, string>;
  let afterCommit: (() => void) | undefined;

  // The database is the only persistence double; routes, messaging services,
  // HTTP transport and Socket.IO room union delivery run their real code.
  async function query(sqlValue: unknown, params: any[] = [], pending = rows): Promise<any[]> {
    const sql = String(sqlValue).replace(/\s+/g, ' ');
    if (sql.includes('actor.role AS actor_role')) {
      const [conversationId, actorId] = params;
      const role = currentRoles.get(actorId);
      const allowed = members.has(actorId) && (role === 'admin' || (role === 'rider' && actorId === 'rider-1'
        && (!sql.includes('dr.assigned_rider_id = actor.id') || actorId === assignedRider)));
      return [conversationId === 'conv-1' && allowed ? [{
        conversation_id: 'conv-1', request_id: 'req-1', rider_id: 'rider-1',
        assigned_rider_id: assignedRider, status: 'open', actor_role: role,
      }] : [], []];
    }
    if (sql.includes('SELECT DISTINCT cp.user_id, c.request_id')) {
      if (failLookup) throw new Error('sensitive database detail');
      return [[...members].filter(id => currentRoles.get(id) === 'admin'
        || (currentRoles.get(id) === 'rider' && id === 'rider-1' && id === assignedRider))
        .map(id => ({ user_id: id, request_id: 'req-1' })), []];
    }
    // Old recipient lookup is supported so pre-repair behavior fails assertions.
    if (sql.includes('SELECT cp.user_id')) {
      return [[...members].filter(id => id !== params[1])
        .map(id => ({ user_id: id, request_id: 'req-1' })), []];
    }
    if (sql.includes('FROM messages m')) {
      if (sql.includes('m.sender_id = ?')) {
        return [pending.filter(row => row.sender_id === params[0] && row.client_message_id === params[1]), []];
      }
      return [rows.slice().reverse(), []];
    }
    if (sql.includes('INSERT INTO messages')) {
      if (failPersistence) throw new Error('message persistence unavailable');
      const [id, conversation_id, sender_id, client_message_id, body] = params;
      pending.push({ id, conversation_id, sender_id, client_message_id, body,
        sender_name: sender_id, sender_role: currentRoles.get(sender_id),
        created_at: '2026-10-03 10:00:00.000000', read_at: null });
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes('SELECT CURRENT_TIMESTAMP(6) AS read_at')) {
      return [[{ read_at: '2026-10-03 10:01:00.000000' }], []];
    }
    if (sql.includes('UPDATE conversation_participants')) {
      if (failPersistence) throw new Error('read persistence unavailable');
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes('UPDATE conversations') || sql.includes('INSERT INTO notifications')) {
      return [{ affectedRows: 1 }, []];
    }
    throw new Error(`Unexpected test DB query: ${sql}`);
  }

  beforeEach(async () => {
    clients = [];
    rows = [];
    assignedRider = 'rider-1';
    failPersistence = false;
    failLookup = false;
    currentRoles = new Map(roles);
    afterCommit = undefined;
    db.query.mockReset().mockImplementation((sql, params) => query(sql, params));
    db.getConnection.mockReset().mockImplementation(async () => {
      const pending = rows.slice();
      return {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        query: vi.fn((sql, params) => query(sql, params, pending)),
        commit: vi.fn(async () => { rows = pending; afterCommit?.(); }),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
      };
    });
    const app = express();
    app.use(express.json());
    app.use('/api/conversations', authenticate, conversationsRoutes);
    http = createServer(app);
    io = new Server(http);
    app.set('io', io);
    io.use((socket, next) => {
      const userId = String(socket.handshake.auth.userId);
      if (!roles.has(userId)) return next(new Error('Unknown test identity'));
      socket.data.userId = userId;
      next();
    });
    io.on('connection', socket => {
      socket.join(socket.data.userId);
      // Model sockets which joined before a reassignment or role change.
      if (['former-rider', 'demoted-admin', 'outsider'].includes(socket.data.userId)) {
        socket.join(['conversation_conv-1', 'admin-room']);
      }
      if (socket.handshake.auth.overlap) socket.join('admin-2');
      socket.on('ready', acknowledge => acknowledge());
    });
    await new Promise<void>((resolve, reject) => {
      http.once('error', reject);
      http.listen(0, '127.0.0.1', () => { http.off('error', reject); resolve(); });
    });
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    for (const client of clients) {
      client.socket.removeAllListeners();
      client.socket.disconnect();
    }
    if (io) await new Promise<void>(resolve => io.close(() => resolve()));
    if (http?.listening) await new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
    vi.restoreAllMocks();
  });

  async function client(userId: string, overlap = false): Promise<Client> {
    const socket = connect(url, { auth: { userId, overlap }, transports: ['websocket'],
      autoConnect: false, reconnection: false, forceNew: true });
    const recorded: Client = { socket, events: [] };
    clients.push(recorded);
    socket.onAny((event, payload) => {
      if (['conversation-message', 'conversation-updated', 'conversation-read'].includes(event)) {
        recorded.events.push({ event, payload });
      }
    });
    socket.on('barrier', (_nonce, acknowledge) => acknowledge());
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('Socket connection timeout')); }, 3000);
      const cleanup = () => { clearTimeout(timer); socket.off('connect', onConnect); socket.off('connect_error', onError); };
      const onConnect = () => { cleanup(); resolve(); };
      const onError = (error: Error) => { cleanup(); reject(error); };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      socket.connect();
    });
    await socket.timeout(3000).emitWithAck('ready');
    return recorded;
  }

  // Ordered server-to-client ACKs ensure forbidden late packets cannot pass
  // an absence assertion just because the network has not flushed yet.
  async function barrier(): Promise<void> {
    await io.timeout(3000).emitWithAck('barrier', randomUUID());
  }

  async function send(actor: string, body: string, clientMessageId = randomUUID()) {
    return request(http).post('/api/conversations/conv-1/messages').set('x-test-user', actor)
      .send({ clientMessageId, body });
  }

  it('delivers both directions once, including overlapping rooms, while excluding outsiders and stale rooms', async () => {
    const admin = await client('admin-1', true);
    const rider = await client('rider-1');
    const peers = [admin, rider, await client('admin-2')];
    const excluded = [await client('outsider'), await client('former-rider'), await client('demoted-admin')];
    for (const [actor, body] of [['rider-1:rider', 'rider reply'], ['admin-1:admin', 'admin reply']]) {
      const response = await send(actor, body);
      expect(response.status).toBe(201);
      await barrier();
      for (const peer of peers) {
        expect(peer.events.filter(item => item.event === 'conversation-message' && item.payload.message.id === response.body.id))
          .toEqual([{ event: 'conversation-message', payload: { conversationId: 'conv-1', message: response.body } }]);
        expect(peer.events.filter(item => item.event === 'conversation-updated' && item.payload.lastMessage.id === response.body.id))
          .toEqual([{ event: 'conversation-updated', payload: { conversationId: 'conv-1', lastMessage: response.body } }]);
      }
      for (const outsider of excluded) expect(outsider.events).toEqual([]);
    }
  });

  it('delivers only receipts for reads to authorized users once', async () => {
    const peers = [await client('admin-1', true), await client('admin-2'), await client('rider-1')];
    const stale = await client('former-rider');
    const response = await request(http).put('/api/conversations/conv-1/read').set('x-test-user', 'rider-1:rider');
    expect(response.status).toBe(200);
    await barrier();
    for (const peer of peers) expect(peer.events).toEqual([{
      event: 'conversation-read', payload: { conversationId: 'conv-1', userId: 'rider-1', ...response.body },
    }]);
    expect(stale.events).toEqual([]);
  });

  it('filters newly reassigned riders and newly demoted admins after persistence', async () => {
    const admin = await client('admin-1');
    const demoted = await client('admin-2');
    const rider = await client('rider-1');
    afterCommit = () => {
      assignedRider = 'outsider';
      currentRoles.set('admin-2', 'personnel');
    };
    const response = await send('admin-1:admin', 'assignment changed');
    expect(response.status).toBe(201);
    await barrier();
    expect(admin.events.map(item => item.event)).toEqual(['conversation-message', 'conversation-updated']);
    expect(demoted.events).toEqual([]);
    expect(rider.events).toEqual([]);
  });

  it('returns the saved message if the actor loses authoritative access before delivery', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const peers = [await client('admin-1'), await client('rider-1')];
    afterCommit = () => { assignedRider = 'outsider'; };
    const response = await send('rider-1:rider', 'saved before reassignment');
    expect(response.status).toBe(201);
    expect(rows).toHaveLength(1);
    await barrier();
    for (const peer of peers) expect(peer.events).toEqual([]);
  });

  it('recovers a canonical missed message over REST after reconnect and preserves client ID idempotency', async () => {
    const rider = await client('rider-1');
    rider.socket.disconnect();
    const clientId = randomUUID();
    const sent = await send('admin-1:admin', 'offline message', clientId);
    expect(sent.status).toBe(201);
    const reconnected = await client('rider-1');
    await barrier();
    expect(reconnected.events).toEqual([]);
    const page = await request(http).get('/api/conversations/conv-1/messages').set('x-test-user', 'rider-1:rider');
    expect(page.status).toBe(200);
    expect(page.body).toEqual({ messages: [sent.body], nextCursor: null });
    const repeated = await send('admin-1:admin', 'offline message', clientId);
    expect(repeated.status).toBe(201);
    expect(repeated.body).toEqual(sent.body);
    expect(rows).toHaveLength(1);
  });

  it('keeps saved responses successful without fallback delivery when lookup fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const peers = [await client('admin-1'), await client('rider-1'), await client('former-rider')];
    failLookup = true;
    const sent = await send('rider-1:rider', 'durable message');
    const read = await request(http).put('/api/conversations/conv-1/read');
    expect(sent.status).toBe(201);
    expect(read.status).toBe(200);
    expect(rows).toHaveLength(1);
    await barrier();
    for (const peer of peers) expect(peer.events).toEqual([]);
  });

  it('does not broadcast failed persistence or unauthorized attempts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const peers = [await client('admin-1'), await client('rider-1'), await client('outsider')];
    failPersistence = true;
    expect((await send('rider-1:rider', 'failed save')).status).toBe(500);
    expect((await request(http).put('/api/conversations/conv-1/read')).status).toBe(500);
    failPersistence = false;
    expect((await send('outsider:rider', 'forbidden')).status).toBe(403);
    expect((await send('demoted-admin:admin', 'stale token role')).status).toBe(403);
    assignedRider = 'outsider';
    expect((await send('rider-1:rider', 'former rider')).status).toBe(409);
    expect(rows).toEqual([]);
    await barrier();
    for (const peer of peers) expect(peer.events).toEqual([]);
  });
});
