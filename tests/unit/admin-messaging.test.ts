import { describe, expect, it } from 'vitest';
import type { ConversationMessage, ConversationSummary } from '../../src/app/types/messaging';
import { applyConversationRead, mergeConversationMessage, mergeFetchedAdminMessages, receiveAdminMessage, recordAdminMessage, totalUnreadConversations } from '../../src/app/utils/messaging';

const summary = (overrides: Partial<ConversationSummary> = {}): ConversationSummary => ({
  id: 'conversation-1',
  requestId: 'REQ-1',
  rider: { id: 'rider-1', name: 'Rider One', role: 'rider' },
  status: 'open',
  lastMessageAt: '2026-10-03T09:00:00.000Z',
  createdAt: '2026-10-03T08:00:00.000Z',
  updatedAt: '2026-10-03T09:00:00.000Z',
  request: {
    id: 'REQ-1',
    type: 'Documents',
    deliveryStatus: 'assigned',
    pickupAddress: 'Pickup',
    dropoffAddress: 'Dropoff',
  },
  lastMessage: null,
  unreadCount: 0,
  ...overrides,
});

const message = (overrides: Partial<ConversationMessage> = {}): ConversationMessage => ({
  id: 'message-1',
  conversationId: 'conversation-1',
  sender: { id: 'rider-1', name: 'Rider One', role: 'rider' },
  clientMessageId: 'client-1',
  body: 'On my way',
  createdAt: '2026-10-03T09:30:00.000Z',
  readAt: null,
  ...overrides,
});

describe('admin messaging state helpers', () => {
  it('updates the matching summary from a realtime message without duplicating unread counts', () => {
    const current = [summary({ unreadCount: 1 })];

    expect(mergeConversationMessage(current, message())).toEqual([
      expect.objectContaining({
        id: 'conversation-1',
        lastMessage: expect.objectContaining({ body: 'On my way' }),
        lastMessageAt: '2026-10-03T09:30:00.000Z',
        unreadCount: 2,
      }),
    ]);

    expect(mergeConversationMessage(current, message(), 'conversation-1')).toEqual([
      expect.objectContaining({ unreadCount: 0 }),
    ]);
  });

  it('counts unread messages across the inbox', () => {
    expect(totalUnreadConversations([
      summary({ unreadCount: 2 }),
      summary({ id: 'conversation-2', unreadCount: 3 }),
    ])).toBe(5);
  });

  it('does not count an own-message echo as unread in a hidden thread', () => {
    const own = message({ sender: { id: 'admin-me', name: 'Admin', role: 'admin' } });
    expect(mergeConversationMessage([summary({ unreadCount: 3 })], own, null, 'admin-me')[0].unreadCount).toBe(3);
    expect(mergeConversationMessage([summary()], own, null, 'admin-other')[0].unreadCount).toBe(1);
  });

  it('does not count a canonical echo sharing the latest client ID twice', () => {
    expect(mergeConversationMessage([summary({ lastMessage: message(), unreadCount: 2 })], message({ id: 'canonical' }))[0].unreadCount).toBe(2);
  });

  it('clears only the current reader matching conversation', () => {
    const current = [summary({ unreadCount: 3 }), summary({ id: 'conversation-2', unreadCount: 4 })];
    const receipt = { conversationId: 'conversation-1', userId: 'admin-me', readAt: '2026-10-03 10:00:00' };
    expect(applyConversationRead(current, receipt, 'admin-me').map(item => item.unreadCount)).toEqual([0, 4]);
    expect(applyConversationRead(current, { ...receipt, userId: 'admin-other' }, 'admin-me')).toBe(current);
    expect(applyConversationRead(current, { ...receipt, conversationId: 'unrelated' }, 'admin-me')).toEqual(current);
  });

  it('keeps a socket arrival when an older history snapshot resolves in oldest-first order', () => {
    const older = message({ id: 'older', clientMessageId: 'older-client', createdAt: '2026-10-03 10:00:00.000000' });
    const newer = message({ id: 'newer', clientMessageId: 'newer-client', createdAt: '2026-10-03 10:00:01.000000' });
    expect(mergeFetchedAdminMessages([newer, older], [older]).map(item => item.id)).toEqual(['older', 'newer']);
  });

  it('keeps canonical socket data over a stale snapshot and reconciles client IDs', () => {
    const canonical = message({ id: 'canonical', readAt: '2026-10-03 10:00:02' });
    expect(mergeFetchedAdminMessages([canonical], [message({ id: 'old-id' })])).toEqual([canonical]);
    expect(mergeFetchedAdminMessages([canonical], [canonical, canonical])).toEqual([canonical]);
  });

  it('scopes client IDs to conversation and sender and ignores missing client IDs', () => {
    const other = message({ id: 'other', conversationId: 'conversation-2' });
    const otherSender = message({ id: 'other-sender', sender: { id: 'admin-me', name: 'Admin', role: 'admin' } });
    expect(mergeFetchedAdminMessages([message()], [other, otherSender])).toHaveLength(3);
    expect(mergeFetchedAdminMessages([], [message({ clientMessageId: '' }), message({ id: 'other', clientMessageId: '' })])).toHaveLength(2);
  });

  it('deduplicates old deliveries and canonical client echoes outside state updaters', () => {
    const seen = new Map<string, Set<string>>();
    expect(recordAdminMessage(seen, message())).toBe(true);
    expect(recordAdminMessage(seen, message({ id: 'next', clientMessageId: 'next-client' }))).toBe(true);
    expect(recordAdminMessage(seen, message())).toBe(false);
    expect(recordAdminMessage(seen, message({ id: 'canonical' }))).toBe(false);
    expect(recordAdminMessage(seen, message({ conversationId: 'conversation-2' }))).toBe(true);
    expect(recordAdminMessage(new Map(), message())).toBe(true);
  });

  it('preserves a confirmed receipt and accepts a newer receipt from history', () => {
    const read = message({ readAt: '2026-10-03 10:00:02' });
    expect(mergeFetchedAdminMessages([message()], [read])[0].readAt).toBe('2026-10-03 10:00:02');
    expect(mergeFetchedAdminMessages([read], [message()])[0].readAt).toBe('2026-10-03 10:00:02');
  });

  it('does not regress the inbox preview when an older delivery arrives', () => {
    const newer = message({ id: 'newer', clientMessageId: 'newer-client', createdAt: '2026-10-03T10:00:00.000Z' });
    const result = mergeConversationMessage([summary({ lastMessage: newer, lastMessageAt: newer.createdAt })], message());
    expect(result[0].lastMessage?.id).toBe('newer');
    expect(result[0].lastMessageAt).toBe('2026-10-03T10:00:00.000Z');
  });

  it('acknowledges only a unique incoming message in a visible conversation', () => {
    const seen = new Map<string, Set<string>>();
    const counted = new Map<string, Set<string>>();
    const first = receiveAdminMessage([summary()], message(), 'conversation-1', 'admin-me', seen, counted);
    expect(first.shouldAcknowledge).toBe(true);
    expect(first.conversations[0].unreadCount).toBe(0);
    expect(receiveAdminMessage(first.conversations, message(), 'conversation-1', 'admin-me', seen, counted).shouldAcknowledge).toBe(false);
    const own = message({ id: 'own', clientMessageId: 'own-client', sender: { id: 'admin-me', name: 'Admin', role: 'admin' } });
    expect(receiveAdminMessage(first.conversations, own, 'conversation-1', 'admin-me', seen, counted).shouldAcknowledge).toBe(false);
  });

  it('counts a closed narrow-screen sheet as hidden and deduplicates older deliveries', () => {
    const seen = new Map<string, Set<string>>();
    const counted = new Map<string, Set<string>>();
    const first = receiveAdminMessage([summary()], message(), null, 'admin-me', seen, counted);
    expect(first.shouldAcknowledge).toBe(false);
    expect(first.conversations[0].unreadCount).toBe(1);
    const next = message({ id: 'next', clientMessageId: 'next-client', createdAt: '2026-10-03T10:00:00.000Z' });
    const second = receiveAdminMessage(first.conversations, next, null, 'admin-me', seen, counted);
    const duplicate = receiveAdminMessage(second.conversations, message(), null, 'admin-me', seen, counted);
    expect(duplicate.conversations[0].unreadCount).toBe(2);
    expect(duplicate.conversations[0].lastMessage?.id).toBe('next');
  });

  it('acknowledges a live message already counted by an inbox snapshot without double-counting it', () => {
    const seen = new Map<string, Set<string>>();
    const counted = new Map<string, Set<string>>();
    recordAdminMessage(counted, message());
    const hidden = receiveAdminMessage([summary({ unreadCount: 2, lastMessage: message() })], message(), null, 'admin-me', seen, counted);
    expect(hidden.conversations[0].unreadCount).toBe(2);
    const visible = receiveAdminMessage([summary({ unreadCount: 2, lastMessage: message() })], message(), 'conversation-1', 'admin-me', new Map(), counted);
    expect(visible.shouldAcknowledge).toBe(true);
    expect(visible.conversations[0].unreadCount).toBe(0);
  });

  it('keeps own hidden echoes unread-neutral and treats another admin as a participant', () => {
    const own = message({ sender: { id: 'admin-me', name: 'Admin', role: 'admin' } });
    const result = receiveAdminMessage([summary({ unreadCount: 3 })], own, null, 'admin-me', new Map(), new Map());
    expect(result.conversations[0].unreadCount).toBe(3);
    expect(result.shouldAcknowledge).toBe(false);
    const other = receiveAdminMessage([summary({ unreadCount: 3 })], own, null, 'admin-other', new Map(), new Map());
    expect(other.conversations[0].unreadCount).toBe(4);
    expect(other.shouldAcknowledge).toBe(false);
  });

  it('counts a new incoming event even when metadata arrived before it', () => {
    const result = receiveAdminMessage([summary({ unreadCount: 2, lastMessage: message() })], message(), null, 'admin-me', new Map(), new Map());
    expect(result.conversations[0].unreadCount).toBe(3);
    expect(result.shouldAcknowledge).toBe(false);
  });
});
