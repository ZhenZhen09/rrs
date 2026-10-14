import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, getConnection } = vi.hoisted(() => ({
  query: vi.fn(),
  getConnection: vi.fn(),
}));

vi.mock('../../db', () => ({
  pool: { query, getConnection },
}));

import {
  createMessage,
  ensureMessagingTables,
  getOrCreateRequestConversation,
  listConversations,
  listConversationDeliveryTargets,
  listMessages,
  markConversationRead,
  reconcileRequestConversation,
} from '../messaging';

const participantRows = [{
  conversation_id: 'conv-1',
  request_id: 'req-1',
  rider_id: 'rider-1',
  status: 'open',
  actor_role: 'rider',
  assigned_rider_id: 'rider-1',
}];

function makeConnection() {
  return {
    query: vi.fn(),
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
}

describe('messaging persistence', () => {
  beforeEach(() => {
    query.mockReset();
    getConnection.mockReset();
  });

  it('derives Inbox rider avatar from identity without selecting users.avatar_id', async () => {
    query.mockResolvedValueOnce([[
      {
        id: 'conv-1', request_id: 'req-1', rider_id: 'rider-1', status: 'open',
        last_message_at: '2026-10-02 10:00:00', created_at: '2026-10-02 10:00:00',
        updated_at: '2026-10-02 10:00:00', rider_name: 'Rider One',
        request_type: 'Delivery', delivery_status: 'assigned', pickup_address: 'A', dropoff_address: 'B',
        unread_count: 0, last_message_id: null,
      },
    ], []]);

    const page = await listConversations('admin-1');

    expect(page.conversations[0].rider).toMatchObject({
      id: 'rider-1', name: 'Rider One', role: 'rider', avatarId: 'avatar_05',
    });
    expect(String(query.mock.calls[0][0])).not.toMatch(/(?:rider|sender)\.avatar_id/i);
  });

  it('still derives an Inbox avatar when legacy user rows have no avatar column', async () => {
    query.mockResolvedValueOnce([[
      {
        id: 'conv-1', request_id: 'req-1', rider_id: 'rider-1', status: 'open',
        last_message_at: '2026-10-02 10:00:00', created_at: '2026-10-02 10:00:00',
        updated_at: '2026-10-02 10:00:00', rider_name: 'Rider One',
        request_type: 'Delivery', delivery_status: 'assigned', pickup_address: 'A', dropoff_address: 'B',
        unread_count: 0, last_message_id: null,
      },
    ], []]);

    const page = await listConversations('admin-1');
    expect(page.conversations[0].rider.avatarId).toBe('avatar_05');
  });

  it('uses the rider-selected avatar in Inbox summaries', async () => {
    query.mockResolvedValueOnce([[
      {
        id: 'conv-1', request_id: 'req-1', rider_id: 'rider-1', status: 'open',
        last_message_at: '2026-10-02 10:00:00', created_at: '2026-10-02 10:00:00',
        updated_at: '2026-10-02 10:00:00', rider_name: 'Rider One', rider_avatar_id: 'avatar_03',
        request_type: 'Delivery', delivery_status: 'assigned', pickup_address: 'A', dropoff_address: 'B',
        unread_count: 0, last_message_id: null,
      },
    ], []]);

    const page = await listConversations('admin-1');

    expect(page.conversations[0].rider.avatarId).toBe('avatar_03');
    expect(String(query.mock.calls[0][0])).toContain('rider_avatar_preferences');
  });

  it('authorizes the actor before resolving delivery targets', async () => {
    query.mockResolvedValueOnce([[], []]);

    await expect(listConversationDeliveryTargets('conv-1', 'outsider')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual(['conv-1', 'outsider']);
  });

  it('returns unique delivery IDs using current participant roles and rider assignment', async () => {
    query.mockResolvedValueOnce([participantRows, []]).mockResolvedValueOnce([[
      { user_id: 'admin-1', request_id: 123 },
      { user_id: 'rider-1', request_id: 123 },
      { user_id: 'admin-1', request_id: 123 },
    ], []]);

    expect(await listConversationDeliveryTargets('conv-1', 'rider-1')).toEqual([
      { userId: 'admin-1', requestId: '123' },
      { userId: 'rider-1', requestId: '123' },
    ]);
    const accessSql = String(query.mock.calls[0][0]).replace(/\s+/g, ' ');
    expect(accessSql).toContain('dr.assigned_rider_id = actor.id');
    const targetSql = String(query.mock.calls[1][0]).replace(/\s+/g, ' ');
    expect(targetSql).toContain('JOIN users participant ON participant.id = cp.user_id');
    expect(targetSql).toContain("participant.role = 'admin'");
    expect(targetSql).toContain("participant.role = 'rider'");
    expect(targetSql).toContain('cp.user_id = c.rider_id');
    expect(targetSql).toContain('cp.user_id = dr.assigned_rider_id');
    expect(query.mock.calls[1][1]).toEqual(['conv-1']);
  });

  it('creates bounded messaging tables with uniqueness and pagination indexes', async () => {
    query.mockResolvedValue([[], []]);

    await ensureMessagingTables();

    const ddl = query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' ')).join('\n');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS conversations');
    expect(ddl).toContain('UNIQUE KEY uq_conversations_request_rider (request_id, rider_id)');
    expect(ddl).toContain('INDEX idx_conversations_last_message (last_message_at, id)');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS conversation_participants');
    expect(ddl).toContain('UNIQUE KEY uq_conversation_participants (conversation_id, user_id)');
    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS messages');
    expect(ddl).toContain('body VARCHAR(4000) NOT NULL');
    expect(ddl).toContain('created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');
    expect(ddl).toContain('read_at TIMESTAMP(6) NULL DEFAULT NULL');
    expect(ddl).toContain('UNIQUE KEY uq_messages_sender_client (sender_id, client_message_id)');
    expect(ddl).toContain('INDEX idx_messages_conversation_cursor (conversation_id, created_at, id)');
    expect(ddl).toContain('INDEX idx_messages_sender_created (sender_id, created_at)');
  });

  it('creates one request/rider conversation and enrolls the rider and admins', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[{
        request_id: 'req-1',
        assigned_rider_id: 'rider-1',
        actor_role: 'admin',
      }], []])
      .mockResolvedValueOnce([{ affectedRows: 0 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[{ id: 'conv-1' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 2 }, []]);
    query.mockResolvedValueOnce([[{
      id: 'conv-1', request_id: 'req-1', rider_id: 'rider-1', status: 'open',
      last_message_at: '2026-10-02 10:00:00', created_at: '2026-10-02 10:00:00',
      updated_at: '2026-10-02 10:00:00', rider_name: 'Rider One', request_type: 'Delivery',
      delivery_status: 'assigned', pickup_address: 'A', dropoff_address: 'B', unread_count: 0,
      last_message_id: null,
    }], []]);

    const conversation = await getOrCreateRequestConversation('req-1', 'admin-1');

    expect(conversation.id).toBe('conv-1');
    expect(connection.commit).toHaveBeenCalledOnce();
    const statements = connection.query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' '));
    expect(statements.some((sql) => sql.includes('ON DUPLICATE KEY UPDATE'))).toBe(true);
    expect(statements.some((sql) => sql.includes("SET status = 'closed'") && sql.includes('rider_id <> ?'))).toBe(true);
    expect(statements.some((sql) => sql.includes("status = 'open'"))).toBe(true);
    expect(statements.some((sql) => sql.includes('conversation_participants') && sql.includes("role = 'admin'"))).toBe(true);
    expect(statements.some((sql) => sql.includes('conversation_participants') && sql.includes('VALUES (?, ?)'))).toBe(true);
  });

  it('requires current participant membership before listing messages', async () => {
    query.mockResolvedValueOnce([[], []]);

    await expect(listMessages('conv-1', 'former-rider', null, 20)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(query).toHaveBeenCalledOnce();
  });

  it('returns newest messages with a stable cursor and clamps the requested limit', async () => {
    query
      .mockResolvedValueOnce([participantRows, []])
      .mockResolvedValueOnce([[
        {
          id: 'msg-3', conversation_id: 'conv-1', sender_id: 'rider-1', sender_name: 'Rider One',
          sender_role: 'rider', client_message_id: 'client-3', body: 'Third',
          created_at: '2026-10-02 10:03:00', read_at: null,
        },
        {
          id: 'msg-2', conversation_id: 'conv-1', sender_id: 'admin-1', sender_name: 'Admin One',
          sender_role: 'admin', client_message_id: 'client-2', body: 'Second',
          created_at: '2026-10-02 10:02:00', read_at: null,
        },
        {
          id: 'msg-1', conversation_id: 'conv-1', sender_id: 'rider-1', sender_name: 'Rider One',
          sender_role: 'rider', client_message_id: 'client-1', body: 'First',
          created_at: '2026-10-02 10:01:00', read_at: null,
        },
      ], []]);

    const page = await listMessages('conv-1', 'rider-1', null, 2);

    expect(page.messages.map((message) => message.id)).toEqual(['msg-3', 'msg-2']);
    expect(page.nextCursor).toEqual(expect.any(String));
    const [sql, params] = query.mock.calls[1];
    expect(String(sql).replace(/\s+/g, ' ')).toContain('ORDER BY m.created_at DESC, m.id DESC LIMIT ?');
    expect(params.at(-1)).toBe(3);
  });

  it('uses the saved avatar preference for rider message senders', async () => {
    query
      .mockResolvedValueOnce([participantRows, []])
      .mockResolvedValueOnce([[
        {
          id: 'msg-avatar', conversation_id: 'conv-1', sender_id: 'rider-1', sender_name: 'Rider One',
          sender_role: 'rider', sender_avatar_id: 'avatar_08', client_message_id: 'client-avatar',
          body: 'Hello', created_at: '2026-10-02 10:03:00', read_at: null,
        },
      ], []]);

    const page = await listMessages('conv-1', 'rider-1');

    expect(page.messages[0].sender.avatarId).toBe('avatar_08');
    expect(String(query.mock.calls[1][0])).toContain('rider_avatar_preferences');
  });

  it('caps inbox pages and applies a stable last-message cursor', async () => {
    query.mockResolvedValueOnce([[], []]);
    const cursor = Buffer.from(JSON.stringify(['2026-10-02 10:00:00', 'conv-9'])).toString('base64url');

    await listConversations('admin-1', cursor, 500);

    const [sql, params] = query.mock.calls[0];
    expect(String(sql).replace(/\s+/g, ' ')).toContain('ORDER BY c.last_message_at DESC, c.id DESC LIMIT ?');
    expect(params).toContain('2026-10-02 10:00:00');
    expect(params.at(-1)).toBe(101);
    const normalizedSql = String(sql).replace(/\s+/g, ' ');
    expect(normalizedSql).toContain('cp.last_read_at IS NULL OR unread.created_at > cp.last_read_at');
    expect(normalizedSql).not.toContain('unread.read_at IS NULL');
  });

  it('reconciles reassignment by closing prior riders and opening the current rider conversation', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[{ request_id: 'req-1', assigned_rider_id: 'rider-2' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[{ id: 'conv-2' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 2 }, []]);

    const conversationId = await reconcileRequestConversation('req-1');

    expect(conversationId).toBe('conv-2');
    expect(connection.commit).toHaveBeenCalledOnce();
    const statements = connection.query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' '));
    expect(statements[1]).toContain("SET status = 'closed'");
    expect(statements[1]).toContain('rider_id <> ?');
    expect(statements[2]).toContain("ON DUPLICATE KEY UPDATE status = 'open'");
  });

  it('closes every request conversation when its rider assignment is removed', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[{ request_id: 'req-1', assigned_rider_id: null }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const conversationId = await reconcileRequestConversation('req-1');

    expect(conversationId).toBeNull();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(String(connection.query.mock.calls[1][0]).replace(/\s+/g, ' ')).toContain("SET status = 'closed'");
  });

  it('returns the canonical message for a repeated client message id without another notification', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([participantRows, []])
      .mockResolvedValueOnce([[
        {
          id: 'msg-existing', conversation_id: 'conv-1', sender_id: 'rider-1', sender_name: 'Rider One',
          sender_role: 'rider', client_message_id: 'retry-1', body: 'Already saved',
          created_at: '2026-10-02 10:00:00', read_at: null,
        },
      ], []]);

    const message = await createMessage('rider-1', {
      conversationId: 'conv-1',
      clientMessageId: 'retry-1',
      body: 'Already saved',
    });

    expect(message.id).toBe('msg-existing');
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.query).toHaveBeenCalledTimes(2);
    expect(connection.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO notifications'))).toBe(false);
  });

  it('commits a new message, conversation timestamp, and recipient notification together', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([participantRows, []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[{ user_id: 'admin-1' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[
        {
          id: 'msg-new', conversation_id: 'conv-1', sender_id: 'rider-1', sender_name: 'Rider One',
          sender_role: 'rider', client_message_id: 'client-new', body: 'Ready for pickup',
          created_at: '2026-10-02 10:04:00', read_at: null,
        },
      ], []]);

    const message = await createMessage('rider-1', {
      conversationId: 'conv-1', clientMessageId: 'client-new', body: '  Ready for pickup  ',
    });

    expect(message.body).toBe('Ready for pickup');
    expect(connection.commit).toHaveBeenCalledOnce();
    const statements = connection.query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' '));
    expect(statements.some((sql) => sql.includes('INSERT INTO messages'))).toBe(true);
    expect(statements.some((sql) => sql.includes('UPDATE conversations SET last_message_at'))).toBe(true);
    expect(statements.some((sql) => sql.includes('INSERT INTO notifications'))).toBe(true);
    const insertCall = connection.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO messages'));
    expect(insertCall?.[1]).toEqual(expect.arrayContaining(['rider-1', 'client-new']));
  });

  it('rolls back message persistence when recipient notification persistence fails', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([participantRows, []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[{ user_id: 'admin-1' }], []])
      .mockRejectedValueOnce(new Error('notification insert failed'));

    await expect(createMessage('rider-1', {
      conversationId: 'conv-1', clientMessageId: 'client-new', body: 'Ready',
    })).rejects.toThrow('notification insert failed');
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('keeps closed conversations read-only for enrolled admins', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query.mockResolvedValueOnce([[{
      ...participantRows[0],
      status: 'closed',
      actor_role: 'admin',
    }], []]);

    await expect(createMessage('admin-1', {
      conversationId: 'conv-1', clientMessageId: 'client-closed', body: 'Audit reply',
    })).rejects.toMatchObject({ code: 'CONVERSATION_CLOSED' });
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.query).toHaveBeenCalledOnce();
  });

  it('closes and rejects an open stale conversation before an admin can notify the former rider', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[
        {
          ...participantRows[0],
          rider_id: 'rider-former',
          assigned_rider_id: 'rider-current',
          status: 'open',
          actor_role: 'admin',
        },
      ], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(createMessage('admin-1', {
      conversationId: 'conv-1', clientMessageId: 'client-stale', body: 'Do not deliver',
    })).rejects.toMatchObject({ code: 'CONVERSATION_CLOSED' });

    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.query).toHaveBeenCalledTimes(2);
    const statements = connection.query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' '));
    expect(statements[1]).toContain("UPDATE conversations SET status = 'closed'");
    expect(statements.some((sql) => sql.includes('INSERT INTO notifications'))).toBe(false);
  });

  it('rejects a read update and closes the conversation when the admin assignment view is stale', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[
        {
          ...participantRows[0],
          rider_id: 'rider-former',
          assigned_rider_id: 'rider-current',
          status: 'open',
          actor_role: 'admin',
        },
      ], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(markConversationRead('conv-1', 'admin-1')).rejects.toMatchObject({
      code: 'CONVERSATION_CLOSED',
    });
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it('loads, closes, and rejects a stale former-rider send without weakening membership authorization', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockImplementationOnce(async (sql) => String(sql).includes('dr.assigned_rider_id = actor.id')
        ? [[], []]
        : [[{
            ...participantRows[0],
            rider_id: 'rider-former',
            assigned_rider_id: 'rider-current',
            status: 'open',
            actor_role: 'rider',
          }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(createMessage('rider-former', {
      conversationId: 'conv-1', clientMessageId: 'former-send', body: 'Stale send',
    })).rejects.toMatchObject({ code: 'CONVERSATION_CLOSED' });
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.query).toHaveBeenCalledTimes(2);
  });

  it('loads, closes, and rejects a stale former-rider read update', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockImplementationOnce(async (sql) => String(sql).includes('dr.assigned_rider_id = actor.id')
        ? [[], []]
        : [[{
            ...participantRows[0],
            rider_id: 'rider-former',
            assigned_rider_id: 'rider-current',
            status: 'open',
            actor_role: 'rider',
          }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(markConversationRead('conv-1', 'rider-former')).rejects.toMatchObject({
      code: 'CONVERSATION_CLOSED',
    });
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.query).toHaveBeenCalledTimes(2);
  });

  it('updates participant and incoming-message read timestamps in one transaction', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([participantRows, []])
      .mockResolvedValueOnce([[{ read_at: '2026-10-02 10:05:00.123456' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const result = await markConversationRead('conv-1', 'rider-1');

    expect(result).toEqual({ readAt: '2026-10-02 10:05:00.123456' });
    expect(connection.commit).toHaveBeenCalledOnce();
    const statements = connection.query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' '));
    expect(statements.some((sql) => sql.includes('UPDATE conversation_participants'))).toBe(true);
    expect(statements.some((sql) => sql.includes('UPDATE messages'))).toBe(false);
    expect(statements.some((sql) => sql.includes('SELECT CURRENT_TIMESTAMP(6) AS read_at'))).toBe(true);
  });

  it('keeps admin B unread when admin A marks the same conversation read', async () => {
    const connection = makeConnection();
    getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[
        { ...participantRows[0], actor_role: 'admin' },
      ], []])
      .mockResolvedValueOnce([[{ read_at: '2026-10-02 10:05:00.654321' }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    query.mockResolvedValueOnce([[
      {
        id: 'conv-1', request_id: 'req-1', rider_id: 'rider-1', status: 'open',
        last_message_at: '2026-10-02 10:04:00.000001', created_at: '2026-10-02 10:00:00.000001',
        updated_at: '2026-10-02 10:04:00.000001', rider_name: 'Rider One', request_type: 'Delivery',
        delivery_status: 'assigned', pickup_address: 'A', dropoff_address: 'B', unread_count: 1,
        last_message_id: null,
      },
    ], []]);

    await markConversationRead('conv-1', 'admin-a');
    const adminBPage = await listConversations('admin-b', null, 20);

    expect(adminBPage.conversations[0].unreadCount).toBe(1);
    const participantUpdate = connection.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE conversation_participants'));
    expect(participantUpdate?.[1]).toEqual(['2026-10-02 10:05:00.654321', 'conv-1', 'admin-a']);
    expect(query.mock.calls[0][1].slice(0, 2)).toEqual(['admin-b', 'admin-b']);
    expect(String(query.mock.calls[0][0]).replace(/\s+/g, ' ')).toContain(
      'cp.last_read_at IS NULL OR unread.created_at > cp.last_read_at',
    );
  });
});
