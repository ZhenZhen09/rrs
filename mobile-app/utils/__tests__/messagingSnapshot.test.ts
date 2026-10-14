import { mergeFetchedMessages } from '../messagingRetry';
import type { ConversationMessage } from '@/types/messaging';

const message = (id: string, createdAt: string, senderId = 'admin-1'): ConversationMessage => ({
  id, conversationId: 'conversation-1', clientMessageId: `client-${id}`, body: id,
  sender: { id: senderId, name: senderId, role: senderId === 'admin-1' ? 'admin' : 'rider' }, createdAt, readAt: null,
});

it('retains a socket arrival and a pending send when an older snapshot resolves', () => {
  const older = message('old', '2026-10-03 10:00:00.000000');
  const incoming = message('new', '2026-10-03 10:00:01.000000');
  const pending = { ...message('local', '2026-10-03T02:00:02.000Z', 'rider-1'), localStatus: 'pending' as const };
  expect(mergeFetchedMessages([pending, incoming, older], [older]).map(item => item.id)).toEqual(['local', 'new', 'old']);
});

it('reconciles a pending bubble by client ID without mixing different senders', () => {
  const saved = message('saved', '2026-10-03 10:00:01.000000', 'rider-1');
  const pending = { ...saved, id: 'local-saved', localStatus: 'pending' as const, animateEntry: true };
  const collision = { ...message('other', '2026-10-03 10:00:02.000000'), clientMessageId: saved.clientMessageId };
  const merged = mergeFetchedMessages([pending], [collision, saved]);
  expect(merged.map(item => item.id)).toEqual(['other', 'saved']);
  expect(merged[1].localStatus).toBe('sent');
  expect(merged[1].animateEntry).toBe(true);
});
