import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../db';
import { getDefaultRiderAvatarId } from './riderAvatarCatalog';
import { ensureRiderAvatarPreferencesTable } from './riderAvatarPreferences';
import type {
  ConversationMessage,
  ConversationPage,
  ConversationStatus,
  ConversationSummary,
  CreateMessageInput,
  MessagePage,
  MessagingParticipant,
  MessagingDeliveryTarget,
  MessagingRole,
} from '../types/messaging';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 30;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CLIENT_MESSAGE_ID_LENGTH = 191;
const MESSAGING_COLLATION = 'utf8mb4_unicode_ci';
const MESSAGING_TABLES = [
  'users',
  'delivery_requests',
  'attendance_logs',
  'conversations',
  'conversation_participants',
  'messages',
] as const;

type Queryable = Pick<PoolConnection, 'query'>;

export class MessagingServiceError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONVERSATION_CLOSED' | 'VALIDATION_ERROR' | 'INVALID_CURSOR',
    message: string,
  ) {
    super(message);
    this.name = 'MessagingServiceError';
  }
}

let tablesReady: Promise<void> | null = null;

async function ensureMessagingCollation(): Promise<void> {
  const [columns] = await pool.query(`
    SELECT DISTINCT TABLE_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (?, ?, ?, ?, ?, ?)
      AND COLLATION_NAME IS NOT NULL
      AND COLLATION_NAME <> ?
  `, [...MESSAGING_TABLES, MESSAGING_COLLATION]) as any[];

  for (const row of columns as Array<{ TABLE_NAME: string }>) {
    if (!MESSAGING_TABLES.includes(row.TABLE_NAME as typeof MESSAGING_TABLES[number])) continue;
    await pool.query(
      `ALTER TABLE \`${row.TABLE_NAME}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE ${MESSAGING_COLLATION}`,
    );
  }
}

export async function ensureMessagingTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await ensureRiderAvatarPreferencesTable();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          request_id VARCHAR(191) NOT NULL,
          rider_id VARCHAR(191) NOT NULL,
          status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
          last_message_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE KEY uq_conversations_request_rider (request_id, rider_id),
          INDEX idx_conversations_last_message (last_message_at, id),
          INDEX idx_conversations_rider (rider_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS conversation_participants (
          conversation_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          last_read_at TIMESTAMP(6) NULL DEFAULT NULL,
          created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          UNIQUE KEY uq_conversation_participants (conversation_id, user_id),
          INDEX idx_conversation_participants_user (user_id, conversation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          conversation_id VARCHAR(191) NOT NULL,
          sender_id VARCHAR(191) NOT NULL,
          client_message_id VARCHAR(191) NOT NULL,
          body VARCHAR(4000) NOT NULL,
          created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          read_at TIMESTAMP(6) NULL DEFAULT NULL,
          UNIQUE KEY uq_messages_sender_client (sender_id, client_message_id),
          INDEX idx_messages_conversation_cursor (conversation_id, created_at, id),
          INDEX idx_messages_sender_created (sender_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await ensureMessagingCollation();
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  await tablesReady;
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_PAGE_SIZE);
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify([createdAt, id])).toString('base64url');
}

function decodeCursor(cursor: string | null | undefined): [string, string] | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Array.isArray(decoded) || decoded.length !== 2 || decoded.some((value) => typeof value !== 'string' || !value)) {
      throw new Error('Invalid cursor');
    }
    return [decoded[0], decoded[1]];
  } catch {
    throw new MessagingServiceError('INVALID_CURSOR', 'The pagination cursor is invalid.');
  }
}

function asRole(value: unknown): MessagingRole {
  return value === 'rider' ? 'rider' : 'admin';
}

function mapMessage(row: any): ConversationMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    sender: {
      id: String(row.sender_id),
      name: String(row.sender_name || 'Unknown user'),
      role: asRole(row.sender_role),
      avatarId: row.sender_avatar_id || getDefaultRiderAvatarId(String(row.sender_id)),
    },
    clientMessageId: String(row.client_message_id),
    body: String(row.body),
    createdAt: String(row.created_at),
    readAt: row.read_at == null ? null : String(row.read_at),
  };
}

function mapSummary(row: any): ConversationSummary {
  const lastMessage = row.last_message_id == null ? null : mapMessage({
    id: row.last_message_id,
    conversation_id: row.id,
    sender_id: row.last_sender_id,
    sender_name: row.last_sender_name,
    sender_role: row.last_sender_role,
    client_message_id: row.last_client_message_id,
    body: row.last_message_body,
    created_at: row.last_message_created_at,
    read_at: row.last_message_read_at,
    sender_avatar_id: row.last_sender_avatar_id,
  });

  return {
    id: String(row.id),
    requestId: String(row.request_id),
    rider: {
      id: String(row.rider_id),
      name: String(row.rider_name || 'Unknown rider'),
      role: 'rider',
      avatarId: row.rider_avatar_id || getDefaultRiderAvatarId(String(row.rider_id)),
    },
    status: (row.status === 'closed' ? 'closed' : 'open') as ConversationStatus,
    lastMessageAt: String(row.last_message_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    request: {
      id: String(row.request_id),
      type: row.request_type == null ? null : String(row.request_type),
      deliveryStatus: row.delivery_status == null ? null : String(row.delivery_status),
      pickupAddress: row.pickup_address == null ? null : String(row.pickup_address),
      dropoffAddress: row.dropoff_address == null ? null : String(row.dropoff_address),
    },
    lastMessage,
    unreadCount: Number(row.unread_count || 0),
  };
}

const summarySelect = `
  SELECT
    c.id, c.request_id, c.rider_id, c.status, c.last_message_at, c.created_at, c.updated_at,
    rider.name AS rider_name, rider_avatar.avatar_id AS rider_avatar_id,
    dr.request_type, dr.delivery_status, dr.pickup_address, dr.dropoff_address,
    lm.id AS last_message_id, lm.sender_id AS last_sender_id,
    sender.name AS last_sender_name, sender.role AS last_sender_role,
    lm.client_message_id AS last_client_message_id, lm.body AS last_message_body,
    lm.created_at AS last_message_created_at, lm.read_at AS last_message_read_at,
    sender_avatar.avatar_id AS last_sender_avatar_id,
    (
      SELECT COUNT(*)
      FROM messages unread
      WHERE unread.conversation_id = c.id
        AND unread.sender_id <> ?
        AND (cp.last_read_at IS NULL OR unread.created_at > cp.last_read_at)
    ) AS unread_count
  FROM conversations c
  JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
  JOIN users actor ON actor.id = cp.user_id
  JOIN users rider ON rider.id = c.rider_id
  LEFT JOIN rider_avatar_preferences rider_avatar
    ON rider_avatar.user_id COLLATE utf8mb4_general_ci = rider.id COLLATE utf8mb4_general_ci
  JOIN delivery_requests dr ON dr.request_id = c.request_id
  LEFT JOIN messages lm ON lm.id = (
    SELECT newest.id FROM messages newest
    WHERE newest.conversation_id = c.id
    ORDER BY newest.created_at DESC, newest.id DESC LIMIT 1
  )
  LEFT JOIN users sender ON sender.id = lm.sender_id
  LEFT JOIN rider_avatar_preferences sender_avatar
    ON sender_avatar.user_id COLLATE utf8mb4_general_ci = sender.id COLLATE utf8mb4_general_ci
  WHERE (actor.role = 'admin' OR (actor.role = 'rider' AND c.rider_id = actor.id AND dr.assigned_rider_id = actor.id))
`;

async function getSummary(conversationId: string, actorId: string): Promise<ConversationSummary> {
  const [rows] = await pool.query(
    `${summarySelect} AND c.id = ? LIMIT 1`,
    [actorId, actorId, conversationId],
  ) as any[];
  if (!rows[0]) throw new MessagingServiceError('FORBIDDEN', 'Conversation access is not permitted.');
  return mapSummary(rows[0]);
}

async function assertParticipant(
  db: Queryable,
  conversationId: string,
  actorId: string,
  lock = false,
  allowStaleRider = false,
): Promise<any> {
  const [rows] = await db.query(`
    SELECT c.id AS conversation_id, c.request_id, c.rider_id, c.status,
           actor.role AS actor_role, dr.assigned_rider_id
    FROM conversation_participants cp
    JOIN conversations c ON c.id = cp.conversation_id
    JOIN users actor ON actor.id = cp.user_id
    JOIN delivery_requests dr ON dr.request_id = c.request_id
    WHERE cp.conversation_id = ? AND cp.user_id = ?
      AND (actor.role = 'admin' OR (actor.role = 'rider' AND c.rider_id = actor.id${allowStaleRider ? '' : ' AND dr.assigned_rider_id = actor.id'}))
    ${lock ? 'FOR UPDATE' : ''}
  `, [conversationId, actorId]) as any[];
  if (!rows[0]) throw new MessagingServiceError('FORBIDDEN', 'Conversation access is not permitted.');
  return rows[0];
}

export async function canAccessConversation(conversationId: string, actorId: string): Promise<boolean> {
  try {
    await assertParticipant(pool as unknown as Queryable, conversationId, actorId);
    return true;
  } catch (error) {
    if (error instanceof MessagingServiceError) return false;
    throw error;
  }
}

export async function listConversationDeliveryTargets(
  conversationId: string,
  actorId: string,
): Promise<MessagingDeliveryTarget[]> {
  await assertParticipant(pool as unknown as Queryable, conversationId, actorId);
  const [rows] = await pool.query(`
    SELECT DISTINCT cp.user_id, c.request_id
    FROM conversation_participants cp
    JOIN conversations c ON c.id = cp.conversation_id
    JOIN users participant ON participant.id = cp.user_id
    JOIN delivery_requests dr ON dr.request_id = c.request_id
    WHERE cp.conversation_id = ?
      AND (
        participant.role = 'admin'
        OR (participant.role = 'rider'
            AND cp.user_id = c.rider_id
            AND cp.user_id = dr.assigned_rider_id)
      )
  `, [conversationId]) as any[];
  const targets = new Map<string, MessagingDeliveryTarget>();
  for (const row of rows as Array<{ user_id: unknown; request_id: unknown }>) {
    const userId = String(row.user_id);
    targets.set(userId, { userId, requestId: String(row.request_id) });
  }
  return [...targets.values()];
}

export async function getOrCreateRequestConversation(requestId: string, actorId: string): Promise<ConversationSummary> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [requestRows] = await connection.query(`
      SELECT dr.request_id, dr.assigned_rider_id, actor.role AS actor_role
      FROM delivery_requests dr
      JOIN users actor ON actor.id = ?
      WHERE dr.request_id = ?
      FOR UPDATE
    `, [actorId, requestId]) as any[];
    const request = requestRows[0];
    if (!request) throw new MessagingServiceError('NOT_FOUND', 'Delivery request not found.');
    if (!request.assigned_rider_id) throw new MessagingServiceError('VALIDATION_ERROR', 'The request has no assigned rider.');
    if (request.actor_role !== 'admin' && actorId !== String(request.assigned_rider_id)) {
      throw new MessagingServiceError('FORBIDDEN', 'Request conversation access is not permitted.');
    }

    const conversationId = await reconcileRequestConversationWithConnection(
      connection,
      requestId,
      String(request.assigned_rider_id),
    );
    if (!conversationId) throw new MessagingServiceError('VALIDATION_ERROR', 'The request has no assigned rider.');
    await connection.commit();
    return await getSummary(conversationId, actorId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reconcileRequestConversationWithConnection(
  connection: PoolConnection,
  requestId: string,
  assignedRiderId: string | null,
): Promise<string | null> {
  if (assignedRiderId) {
    await connection.query(`
      UPDATE conversations
      SET status = 'closed', updated_at = CURRENT_TIMESTAMP(6)
      WHERE request_id = ? AND rider_id <> ? AND status <> 'closed'
    `, [requestId, assignedRiderId]);
  } else {
    await connection.query(`
      UPDATE conversations
      SET status = 'closed', updated_at = CURRENT_TIMESTAMP(6)
      WHERE request_id = ? AND status <> 'closed'
    `, [requestId]);
    return null;
  }

  const candidateId = randomUUID();
  await connection.query(`
    INSERT INTO conversations (id, request_id, rider_id, status)
    VALUES (?, ?, ?, 'open')
    ON DUPLICATE KEY UPDATE status = 'open', updated_at = CURRENT_TIMESTAMP(6)
  `, [candidateId, requestId, assignedRiderId]);
  const [conversationRows] = await connection.query(
    'SELECT id FROM conversations WHERE request_id = ? AND rider_id = ? LIMIT 1',
    [requestId, assignedRiderId],
  ) as any[];
  const conversationId = String(conversationRows[0].id);
  await connection.query(`
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)
  `, [conversationId, assignedRiderId]);
  await connection.query(`
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT ?, id FROM users WHERE role = 'admin'
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)
  `, [conversationId]);
  return conversationId;
}

export async function reconcileRequestConversation(requestId: string): Promise<string | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [requestRows] = await connection.query(`
      SELECT request_id, assigned_rider_id
      FROM delivery_requests
      WHERE request_id = ?
      FOR UPDATE
    `, [requestId]) as any[];
    if (!requestRows[0]) throw new MessagingServiceError('NOT_FOUND', 'Delivery request not found.');
    const assignedRiderId = requestRows[0].assigned_rider_id == null
      ? null
      : String(requestRows[0].assigned_rider_id);
    const conversationId = await reconcileRequestConversationWithConnection(connection, requestId, assignedRiderId);
    await connection.commit();
    return conversationId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listConversations(actorId: string, cursor?: string | null, limit?: number): Promise<ConversationPage> {
  const pageSize = clampLimit(limit);
  const decodedCursor = decodeCursor(cursor);
  const cursorClause = decodedCursor
    ? ' AND (c.last_message_at < ? OR (c.last_message_at = ? AND c.id < ?))'
    : '';
  const params: unknown[] = [actorId, actorId];
  if (decodedCursor) params.push(decodedCursor[0], decodedCursor[0], decodedCursor[1]);
  params.push(pageSize + 1);

  const [rows] = await pool.query(
    `${summarySelect}${cursorClause} ORDER BY c.last_message_at DESC, c.id DESC LIMIT ?`,
    params,
  ) as any[];
  const hasMore = rows.length > pageSize;
  const selected = rows.slice(0, pageSize);
  const last = selected[selected.length - 1];
  return {
    conversations: selected.map(mapSummary),
    nextCursor: hasMore && last ? encodeCursor(String(last.last_message_at), String(last.id)) : null,
  };
}

const messageSelect = `
  SELECT m.id, m.conversation_id, m.sender_id, sender.name AS sender_name,
         sender.role AS sender_role, sender_avatar.avatar_id AS sender_avatar_id,
         m.client_message_id, m.body, m.created_at, m.read_at
  FROM messages m
  JOIN users sender ON sender.id = m.sender_id
  LEFT JOIN rider_avatar_preferences sender_avatar
    ON sender_avatar.user_id COLLATE utf8mb4_general_ci = sender.id COLLATE utf8mb4_general_ci
`;

export async function listMessages(
  conversationId: string,
  actorId: string,
  before?: string | null,
  limit?: number,
): Promise<MessagePage> {
  await assertParticipant(pool as unknown as Queryable, conversationId, actorId);
  const pageSize = clampLimit(limit);
  const decodedCursor = decodeCursor(before);
  const cursorClause = decodedCursor
    ? ' AND (m.created_at < ? OR (m.created_at = ? AND m.id < ?))'
    : '';
  const params: unknown[] = [conversationId];
  if (decodedCursor) params.push(decodedCursor[0], decodedCursor[0], decodedCursor[1]);
  params.push(pageSize + 1);
  const [rows] = await pool.query(
    `${messageSelect} WHERE m.conversation_id = ?${cursorClause} ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    params,
  ) as any[];
  const hasMore = rows.length > pageSize;
  const selected = rows.slice(0, pageSize);
  const last = selected[selected.length - 1];
  return {
    messages: selected.map(mapMessage),
    nextCursor: hasMore && last ? encodeCursor(String(last.created_at), String(last.id)) : null,
  };
}

function validateMessageInput(input: CreateMessageInput): string {
  const body = input.body.trim();
  if (!body) throw new MessagingServiceError('VALIDATION_ERROR', 'Message body cannot be empty.');
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new MessagingServiceError('VALIDATION_ERROR', `Message body cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (!input.clientMessageId || input.clientMessageId.length > MAX_CLIENT_MESSAGE_ID_LENGTH) {
    throw new MessagingServiceError('VALIDATION_ERROR', 'Client message id is invalid.');
  }
  return body;
}

async function findMessageByClientId(db: Queryable, senderId: string, clientMessageId: string): Promise<ConversationMessage | null> {
  const [rows] = await db.query(
    `${messageSelect} WHERE m.sender_id = ? AND m.client_message_id = ? LIMIT 1`,
    [senderId, clientMessageId],
  ) as any[];
  return rows[0] ? mapMessage(rows[0]) : null;
}

export async function createMessage(actorId: string, input: CreateMessageInput): Promise<ConversationMessage> {
  const body = validateMessageInput(input);
  const connection = await pool.getConnection();
  let transactionFinalized = false;
  try {
    await connection.beginTransaction();
    const conversation = await assertParticipant(connection, input.conversationId, actorId, true, true);
    if (!conversation.assigned_rider_id || String(conversation.rider_id) !== String(conversation.assigned_rider_id)) {
      await connection.query(
        "UPDATE conversations SET status = 'closed', updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?",
        [input.conversationId],
      );
      await connection.commit();
      transactionFinalized = true;
      throw new MessagingServiceError('CONVERSATION_CLOSED', 'The conversation rider assignment is no longer current.');
    }
    if (conversation.status !== 'open') {
      throw new MessagingServiceError('CONVERSATION_CLOSED', 'Closed conversations are read-only.');
    }

    const existing = await findMessageByClientId(connection, actorId, input.clientMessageId);
    if (existing) {
      await connection.commit();
      return existing;
    }

    const messageId = randomUUID();
    try {
      await connection.query(`
        INSERT INTO messages (id, conversation_id, sender_id, client_message_id, body)
        VALUES (?, ?, ?, ?, ?)
      `, [messageId, input.conversationId, actorId, input.clientMessageId, body]);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_ENTRY') throw error;
      const racedMessage = await findMessageByClientId(connection, actorId, input.clientMessageId);
      if (!racedMessage) throw error;
      await connection.commit();
      return racedMessage;
    }

    await connection.query(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [input.conversationId],
    );
    const [recipients] = await connection.query(
      `SELECT cp.user_id
       FROM conversation_participants cp
       JOIN users recipient ON recipient.id = cp.user_id
       JOIN conversations c ON c.id = cp.conversation_id
       JOIN delivery_requests dr ON dr.request_id = c.request_id
       WHERE cp.conversation_id = ? AND cp.user_id <> ?
         AND c.rider_id = dr.assigned_rider_id
         AND (recipient.role = 'admin' OR cp.user_id = dr.assigned_rider_id)`,
      [input.conversationId, actorId],
    ) as any[];
    for (const recipient of recipients as any[]) {
      await connection.query(`
        INSERT INTO notifications (id, user_id, message, type, request_id)
        VALUES (?, ?, ?, 'conversation_message', ?)
      `, [randomUUID(), recipient.user_id, `New message for request #${String(conversation.request_id).slice(-6).toUpperCase()}.`, conversation.request_id]);
    }
    const saved = await findMessageByClientId(connection, actorId, input.clientMessageId);
    if (!saved) throw new Error('Message insert succeeded but the saved row could not be read.');
    await connection.commit();
    transactionFinalized = true;
    return saved;
  } catch (error) {
    if (!transactionFinalized) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function markConversationRead(conversationId: string, actorId: string): Promise<{ readAt: string }> {
  const connection = await pool.getConnection();
  let transactionFinalized = false;
  try {
    await connection.beginTransaction();
    const conversation = await assertParticipant(connection, conversationId, actorId, true, true);
    if (!conversation.assigned_rider_id || String(conversation.rider_id) !== String(conversation.assigned_rider_id)) {
      await connection.query(
        "UPDATE conversations SET status = 'closed', updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?",
        [conversationId],
      );
      await connection.commit();
      transactionFinalized = true;
      throw new MessagingServiceError('CONVERSATION_CLOSED', 'The conversation rider assignment is no longer current.');
    }
    const [timestampRows] = await connection.query('SELECT CURRENT_TIMESTAMP(6) AS read_at') as any[];
    const readAt = String(timestampRows[0].read_at);
    await connection.query(`
      UPDATE conversation_participants
      SET last_read_at = ?
      WHERE conversation_id = ? AND user_id = ?
    `, [readAt, conversationId, actorId]);
    await connection.commit();
    transactionFinalized = true;
    return { readAt };
  } catch (error) {
    if (!transactionFinalized) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type { ConversationMessage, ConversationPage, ConversationSummary, CreateMessageInput, MessagePage, MessagingParticipant };
