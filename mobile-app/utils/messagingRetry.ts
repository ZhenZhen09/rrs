import type { ConversationMessage } from '@/types/messaging';

export type LocalMessageStatus = 'pending' | 'failed' | 'sent';

export type LocalConversationMessage = ConversationMessage & { localStatus?: LocalMessageStatus; animateEntry?: boolean };

export interface LocalMessage {
  id?: string;
  clientMessageId: string;
  body: string;
  status: LocalMessageStatus;
}

const randomHex = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export const createClientMessageId = () => {
  const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return cryptoObject?.randomUUID?.call(cryptoObject)
    || `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`;
};

export const reconcileMessage = (
  local: LocalMessage,
  server: { id: string; clientMessageId: string },
): LocalMessage => ({
  ...local,
  id: server.id,
  clientMessageId: server.clientMessageId,
  status: 'sent',
});

export const getMessageTimestamp = (value: string): number => {
  // The backend returns SQL timestamp strings in its +08:00 timezone.
  const timestamp = /^\d{4}-\d{2}-\d{2} /.test(value)
    ? `${value.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1')}+08:00` : value;
  return Date.parse(timestamp) || 0;
};

export function mergeFetchedMessages(current: LocalConversationMessage[], fetched: LocalConversationMessage[]): LocalConversationMessage[] {
  const merged = current.slice();
  for (const incoming of fetched) {
    const index = merged.findIndex(item => item.id === incoming.id || (item.sender.id === incoming.sender.id && item.clientMessageId === incoming.clientMessageId));
    if (index < 0) merged.push(incoming);
    else {
      const previous = merged[index];
      merged[index] = {
        ...previous, ...incoming, animateEntry: previous.animateEntry || incoming.animateEntry,
        localStatus: !incoming.id.startsWith('local-') && previous.localStatus ? 'sent' : incoming.localStatus ?? previous.localStatus,
      };
    }
  }
  return merged.sort((a, b) => getMessageTimestamp(b.createdAt) - getMessageTimestamp(a.createdAt) || b.id.localeCompare(a.id));
}
