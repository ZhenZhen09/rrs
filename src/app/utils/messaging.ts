import type { ConversationMessage, ConversationSummary } from '../types/messaging';
import type { Socket } from 'socket.io-client';

export type ConversationMessageEvent = { conversationId: string; message: ConversationMessage };
export type ConversationReadEvent = { conversationId: string; userId: string; readAt: string };
export type ConversationUpdatedEvent = { conversationId: string; lastMessage?: ConversationMessage; userId?: string; readAt?: string };

export function subscribeAdminRiderMessagePreview(
  socket: Pick<Socket, 'on' | 'off'>,
  actorId: string,
  onPreview: (message: ConversationMessage) => void,
): () => void {
  const seen = new Set<string>();
  const handleMessage = (payload: ConversationMessageEvent) => {
    const message = payload?.message;
    if (!message || payload.conversationId !== message.conversationId || message.sender.role !== 'rider' || message.sender.id === actorId) return;

    const keys = [`id:${message.id}`, ...(message.clientMessageId ? [`client:${message.sender.id}:${message.clientMessageId}`] : [])];
    if (keys.some(key => seen.has(key))) return;
    keys.forEach(key => seen.add(key));
    if (seen.size > 500) seen.delete(seen.values().next().value!);
    onPreview(message);
  };
  socket.on('conversation-message', handleMessage);
  return () => socket.off('conversation-message', handleMessage);
}

function messageKeys(message: ConversationMessage): string[] {
  return [
    `id:${message.id}`,
    ...(message.clientMessageId ? [`client:${message.sender.id}:${message.clientMessageId}`] : []),
  ];
}

// Called by event/fetch handlers, never from a React state updater.
export function recordAdminMessage(seen: Map<string, Set<string>>, message: ConversationMessage): boolean {
  const keys = messageKeys(message);
  const conversationKeys = seen.get(message.conversationId) || new Set<string>();
  const unique = !keys.some(key => conversationKeys.has(key));
  keys.forEach(key => conversationKeys.add(key));
  seen.set(message.conversationId, conversationKeys);
  return unique;
}

export function applyConversationRead(
  conversations: ConversationSummary[], receipt: ConversationReadEvent, actorId: string,
): ConversationSummary[] {
  if (receipt.userId !== actorId) return conversations;
  return conversations.map(item => item.id === receipt.conversationId ? { ...item, unreadCount: 0 } : item);
}

export function mergeFetchedAdminMessages(current: ConversationMessage[], fetched: ConversationMessage[]): ConversationMessage[] {
  const indices = new Map<string, Map<string, number>>();
  const merged: ConversationMessage[] = [];
  // Current canonical arrivals win over an earlier HTTP snapshot.
  for (const message of [...current, ...fetched]) {
    const keys = messageKeys(message);
    const conversationIndices = indices.get(message.conversationId) || new Map<string, number>();
    const existingIndex = keys.map(key => conversationIndices.get(key)).find(index => index !== undefined);
    const index = existingIndex ?? merged.length;
    if (existingIndex === undefined) merged.push(message);
    else if (!merged[index].readAt && message.readAt) merged[index] = { ...merged[index], readAt: message.readAt };
    keys.forEach(key => conversationIndices.set(key, index));
    indices.set(message.conversationId, conversationIndices);
  }
  return merged.sort((left, right) => compareMessageDates(left.createdAt, right.createdAt));
}

function compareMessageDates(left: string, right: string): number {
  // SQL timestamps already carry the backend's wall time. Do not append a
  // timezone or round microseconds while ordering messages from that backend.
  return left.replace(' ', 'T').localeCompare(right.replace(' ', 'T'));
}

export function receiveAdminMessage(
  conversations: ConversationSummary[], message: ConversationMessage,
  visibleConversationId: string | null, actorId: string,
  seen: Map<string, Set<string>>, counted: Map<string, Set<string>>,
): { unique: boolean; conversations: ConversationSummary[]; shouldAcknowledge: boolean } {
  const unique = recordAdminMessage(seen, message);
  const uncounted = recordAdminMessage(counted, message);
  const incoming = message.sender.id !== actorId;
  const visible = visibleConversationId === message.conversationId;
  const previous = conversations.find(item => item.id === message.conversationId);
  const next = unique ? mergeConversationMessage(conversations, message, visibleConversationId, actorId) : conversations;
  return {
    unique,
    conversations: unique && previous ? next.map(item => item.id === previous.id ? {
      ...item,
      unreadCount: visible ? 0 : previous.unreadCount + (incoming && uncounted ? 1 : 0),
    } : item) : next,
    shouldAcknowledge: unique && incoming && visible,
  };
}

export function subscribeAdminMessaging(
  socket: Pick<Socket, 'on' | 'off'>,
  handlers: {
    onMessage: (payload: ConversationMessageEvent) => void;
    onRead: (payload: ConversationReadEvent) => void;
    onMetadata: (payload: ConversationUpdatedEvent) => void;
    onConnect: () => void;
  },
): () => void {
  const onUpdated = (payload: ConversationUpdatedEvent) => {
    if (payload.userId && payload.readAt) {
      handlers.onRead({ conversationId: payload.conversationId, userId: payload.userId, readAt: payload.readAt });
    } else {
      handlers.onMetadata(payload);
    }
  };
  socket.on('conversation-message', handlers.onMessage);
  socket.on('conversation-read', handlers.onRead);
  socket.on('conversation-updated', onUpdated);
  socket.on('connect', handlers.onConnect);
  return () => {
    socket.off('conversation-message', handlers.onMessage);
    socket.off('conversation-read', handlers.onRead);
    socket.off('conversation-updated', onUpdated);
    socket.off('connect', handlers.onConnect);
  };
}

export function mergeConversationMessage(
  conversations: ConversationSummary[],
  message: ConversationMessage,
  activeConversationId?: string | null,
  actorId?: string,
): ConversationSummary[] {
  const index = conversations.findIndex((conversation) => conversation.id === message.conversationId);
  if (index < 0) return conversations;

  const conversation = conversations[index];
  const latest = conversation.lastMessage;
  const alreadyLatest = latest?.id === message.id || Boolean(message.clientMessageId && latest?.clientMessageId === message.clientMessageId && latest.sender.id === message.sender.id);
  const older = latest && compareMessageDates(message.createdAt, latest.createdAt) < 0;
  const next = {
    ...conversation,
    lastMessage: older ? latest : message,
    lastMessageAt: older ? conversation.lastMessageAt : message.createdAt,
    updatedAt: older ? conversation.updatedAt : message.createdAt,
    unreadCount: activeConversationId === message.conversationId
      ? 0
      : alreadyLatest || message.sender.id === actorId ? conversation.unreadCount : conversation.unreadCount + 1,
  };

  return [next, ...conversations.filter((_, conversationIndex) => conversationIndex !== index)];
}

export function totalUnreadConversations(conversations: ConversationSummary[]): number {
  return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
}
