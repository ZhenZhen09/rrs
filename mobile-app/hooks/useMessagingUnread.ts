import { useEffect, useState } from 'react';
import { getConversations } from '@/services/messagingApi';
import { getUnreadConversationCount } from '@/utils/messagingUnread';
import { useLocation } from '@/context/LocationContext';
import { createMessagingRefreshQueue } from '@/utils/messagingRefresh';

export function useMessagingUnread(): number {
  const { subscribeToSocketEvent, isSocketConnected } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let active = true;
    const queue = createMessagingRefreshQueue(async () => {
      const page = await getConversations();
      if (active) setUnreadCount(getUnreadConversationCount(page.conversations));
    }, () => undefined);
    const refresh = () => { void queue.request(); };
    refresh();
    const removeMessage = subscribeToSocketEvent('conversation-message', refresh);
    const removeUpdate = subscribeToSocketEvent('conversation-updated', refresh);
    const removeRead = subscribeToSocketEvent('conversation-read', refresh);
    return () => { active = false; queue.dispose(); removeMessage(); removeUpdate(); removeRead(); };
  }, [isSocketConnected, subscribeToSocketEvent]);

  return unreadCount;
}
