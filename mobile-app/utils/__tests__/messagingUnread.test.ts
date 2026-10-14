import { getUnreadConversationCount } from '../messagingUnread';

describe('getUnreadConversationCount', () => {
  it('adds unread messages across all conversations', () => {
    expect(getUnreadConversationCount([
      { unreadCount: 2 },
      { unreadCount: 0 },
      { unreadCount: 3 },
    ])).toBe(5);
  });

  it('ignores invalid or negative unread counts', () => {
    expect(getUnreadConversationCount([
      { unreadCount: -1 },
      { unreadCount: '2' },
      { unreadCount: null },
    ])).toBe(0);
  });
});
