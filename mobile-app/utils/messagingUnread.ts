export function getUnreadConversationCount(conversations: Array<{ unreadCount?: unknown }>): number {
  return conversations.reduce((total, conversation) => {
    const count = conversation.unreadCount;
    return total + (typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : 0);
  }, 0);
}
