import { act, renderHook } from '@testing-library/react-native';
import { useMessaging } from '@/hooks/useMessaging';
import { getConversations, getMessages, markConversationRead, sendMessage } from '@/services/messagingApi';
import { useLocation } from '@/context/LocationContext';

jest.mock('@/services/messagingApi', () => ({
  getConversations: jest.fn(),
  getMessages: jest.fn(),
  markConversationRead: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock('@/context/LocationContext', () => ({
  useLocation: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'rider-1', name: 'Rider' } }) }));

let mockFocused = true;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]);
  },
}));

const mockedGetConversations = getConversations as jest.MockedFunction<typeof getConversations>;
const mockedGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;
const mockedMarkConversationRead = markConversationRead as jest.MockedFunction<typeof markConversationRead>;
const mockedSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;
const listeners = new Map<string, (...args: any[]) => void>();
const subscribe = (event: string, listener: (...args: any[]) => void) => {
  listeners.set(event, listener);
  return () => { if (listeners.get(event) === listener) listeners.delete(event); };
};
const incoming = {
  id: 'incoming-1', conversationId: 'conversation-1', clientMessageId: 'incoming-client',
  sender: { id: 'admin-1', name: 'Admin', role: 'admin' as const }, body: 'Dispatch update',
  createdAt: '2026-10-03 10:00:00.000000', readAt: null,
};

describe('useMessaging send resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
    mockFocused = true;
    mockedGetConversations.mockResolvedValue({ conversations: [], nextCursor: null });
    mockedGetMessages.mockResolvedValue({ messages: [], nextCursor: null });
    mockedMarkConversationRead.mockResolvedValue(undefined);
    (useLocation as jest.Mock).mockReturnValue({
      subscribeToSocketEvent: subscribe,
      isSocketConnected: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records a 429 cooldown without retrying automatically', async () => {
    mockedSendMessage.mockRejectedValue({
      response: { status: 429, headers: { 'retry-after': '45' } },
    });
    const { result } = renderHook(() => useMessaging('conversation-1'));

    await act(async () => { await result.current.send('Hello'); });

    expect(result.current.sendError).toMatch(/try again in 45 seconds/i);
    expect(result.current.sendRetryAfterSeconds).toBe(45);
    expect(mockedSendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not retry a rate-limited message while its cooldown is active', async () => {
    mockedSendMessage.mockRejectedValue({
      response: { status: 429, headers: { 'retry-after': '45' } },
    });
    const { result } = renderHook(() => useMessaging('conversation-1'));

    await act(async () => { await result.current.send('Hello'); });
    await act(async () => { await result.current.retry({ body: 'Hello', clientMessageId: 'client-1', localStatus: 'failed' }); });

    expect(mockedSendMessage).toHaveBeenCalledTimes(1);
  });

  it('exposes retryable network failures without scheduling an automatic retry', async () => {
    mockedSendMessage.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
    const { result } = renderHook(() => useMessaging('conversation-1'));

    await act(async () => { await result.current.send('Hello'); });

    expect(result.current.sendError).toMatch(/network error/i);
    expect(result.current.sendRetryAfterSeconds).toBe(0);
    expect(mockedSendMessage).toHaveBeenCalledTimes(1);
  });

  it('allows a manual retry after the rate-limit cooldown expires', async () => {
    jest.useFakeTimers();
    mockedSendMessage
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '1' } } })
      .mockResolvedValueOnce({ ...incoming, id: 'server-1', clientMessageId: 'client-1', sender: { id: 'rider-1', name: 'Rider', role: 'rider' } });
    const { result } = renderHook(() => useMessaging('conversation-1'));

    await act(async () => { await result.current.send('Hello'); });
    act(() => { jest.advanceTimersByTime(1000); });
    await act(async () => { await result.current.retry({ body: 'Hello', clientMessageId: 'client-1', localStatus: 'failed' }); });

    expect(result.current.sendRetryAfterSeconds).toBe(0);
    expect(mockedSendMessage).toHaveBeenCalledTimes(2);
  });

  it.each(['conversation-updated', 'conversation-read'])('does not reload messages after a %s receipt', async event => {
    renderHook(() => useMessaging('conversation-1'));
    await act(async () => {});
    mockedGetMessages.mockClear();
    mockedMarkConversationRead.mockClear();
    expect(listeners.has(event)).toBe(true);
    await act(async () => {
      listeners.get(event)?.({ conversationId: 'conversation-1', userId: 'rider-1', readAt: incoming.createdAt });
    });
    expect(mockedGetMessages).not.toHaveBeenCalled();
    expect(mockedMarkConversationRead).not.toHaveBeenCalled();
  });

  it('acknowledges a unique incoming message once and never an own echo', async () => {
    const { result } = renderHook(() => useMessaging('conversation-1'));
    await act(async () => {});
    mockedMarkConversationRead.mockClear();
    await act(async () => {
      listeners.get('conversation-message')?.({ conversationId: 'conversation-1', message: incoming });
      listeners.get('conversation-message')?.({ conversationId: 'conversation-1', message: incoming });
    });
    expect(result.current.messages.filter(item => item.id === incoming.id)).toHaveLength(1);
    expect(mockedMarkConversationRead).toHaveBeenCalledTimes(1);
    mockedMarkConversationRead.mockClear();
    await act(async () => {
      listeners.get('conversation-message')?.({ conversationId: 'conversation-1', message: { ...incoming, id: 'own-1', clientMessageId: 'own-client', sender: { id: 'rider-1', name: 'Rider', role: 'rider' } } });
    });
    expect(mockedMarkConversationRead).not.toHaveBeenCalled();
  });

  it('does not acknowledge messages when the conversation is not focused', async () => {
    mockFocused = false;
    renderHook(() => useMessaging('conversation-1'));
    await act(async () => { listeners.get('conversation-message')?.({ conversationId: 'conversation-1', message: incoming }); });
    expect(mockedMarkConversationRead).not.toHaveBeenCalled();
  });

  it('shares concurrent message refreshes', async () => {
    mockFocused = false;
    let release!: (page: { messages: typeof incoming[]; nextCursor: null }) => void;
    mockedGetMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const { result } = renderHook(() => useMessaging('conversation-1'));
    await act(async () => {
      const first = result.current.refreshMessages();
      const second = result.current.refreshMessages();
      release({ messages: [], nextCursor: null });
      await Promise.all([first, second]);
    });
    expect(mockedGetMessages).toHaveBeenCalledTimes(1);
  });

  it('rejects a stale fetch after the selected conversation changes', async () => {
    let release!: (page: { messages: typeof incoming[]; nextCursor: null }) => void;
    mockedGetMessages.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const { result, rerender } = renderHook(({ id }) => useMessaging(id), { initialProps: { id: 'conversation-1' } });
    rerender({ id: 'conversation-2' });
    await act(async () => { release({ messages: [incoming], nextCursor: null }); });
    expect(result.current.messages).toEqual([]);
    expect(mockedMarkConversationRead.mock.calls.some(([id]) => id === 'conversation-1')).toBe(false);
  });

  it('recovers the focused thread once on reconnect', async () => {
    const { rerender } = renderHook(() => useMessaging('conversation-1'));
    await act(async () => {});
    mockedGetMessages.mockClear();
    (useLocation as jest.Mock).mockReturnValue({ subscribeToSocketEvent: subscribe, isSocketConnected: true });
    await act(async () => { rerender({}); });
    expect(mockedGetMessages).toHaveBeenCalledTimes(1);
    await act(async () => { rerender({}); });
    expect(mockedGetMessages).toHaveBeenCalledTimes(1);
  });
});
