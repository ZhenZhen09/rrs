import { act, renderHook } from '@testing-library/react-native';
import { useMessagingUnread } from '../useMessagingUnread';
import { getConversations } from '@/services/messagingApi';
import { useLocation } from '@/context/LocationContext';
import type { ConversationSummary } from '@/types/messaging';

jest.mock('@/services/messagingApi', () => ({ getConversations: jest.fn() }));
jest.mock('@/context/LocationContext', () => ({ useLocation: jest.fn() }));
const summary = (unreadCount: number): ConversationSummary => ({
  id: 'conversation-1', requestId: 'request-1', rider: { id: 'rider-1', name: 'Rider', role: 'rider' },
  request: { id: 'request-1', type: null, deliveryStatus: 'assigned', pickupAddress: null, dropoffAddress: null },
  status: 'open', unreadCount, lastMessage: null, createdAt: '2026-10-03 10:00:00', updatedAt: '2026-10-03 10:00:00', lastMessageAt: '2026-10-03 10:00:00',
});

it('reconciles the final unread count after a burst and cleans up listeners', async () => {
  jest.useFakeTimers();
  const listeners = new Map<string, () => void>();
  (useLocation as jest.Mock).mockReturnValue({ isSocketConnected: true, subscribeToSocketEvent: (event: string, listener: () => void) => {
    listeners.set(event, listener);
    return () => listeners.delete(event);
  } });
  const get = getConversations as jest.MockedFunction<typeof getConversations>;
  get.mockResolvedValueOnce({ conversations: [summary(3)], nextCursor: null }).mockResolvedValue({ conversations: [summary(0)], nextCursor: null });
  const { result, unmount } = renderHook(() => useMessagingUnread());
  await act(async () => {});
  expect(result.current).toBe(3);
  act(() => { for (let i = 0; i < 20; i += 1) listeners.get('conversation-read')?.(); });
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(result.current).toBe(0);
  expect(get).toHaveBeenCalledTimes(2);
  unmount();
  expect(listeners.size).toBe(0);
  await jest.advanceTimersByTimeAsync(30_000);
  expect(get).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
