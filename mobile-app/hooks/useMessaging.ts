import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { ConversationMessage, ConversationSummary } from '@/types/messaging';
import { getConversations, getMessages, markConversationRead, sendMessage } from '@/services/messagingApi';
import { createClientMessageId, mergeFetchedMessages, type LocalConversationMessage } from '@/utils/messagingRetry';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { createMessagingRefreshQueue } from '@/utils/messagingRefresh';
import { getMessagingErrorMessage, getMessagingRetryAfterSeconds } from '@/utils/messagingRateLimit';

type ReadEvent = { conversationId: string; userId: string; readAt: string };
const requestError = (error: unknown, fallback: string) => (
  (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback
);
const identityOf = (message: ConversationMessage) => [message.conversationId, message.sender.id, message.clientMessageId].join(':');

export const useMessaging = (conversationId?: string) => {
  const { subscribeToSocketEvent, isSocketConnected } = useLocation();
  const { user } = useAuth();
  const actorId: string = user?.id || 'me';
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [loadMoreConversationsError, setLoadMoreConversationsError] = useState<string | null>(null);
  const [thread, setThread] = useState<{ id?: string; messages: LocalConversationMessage[] }>({ id: conversationId, messages: [] });
  const messages = thread.id === conversationId ? thread.messages : [];
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(Boolean(conversationId));
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loadOlderMessagesError, setLoadOlderMessagesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendRetryAfterSeconds, setSendRetryAfterSeconds] = useState(0);
  const mounted = useRef(false);
  const focused = useRef(false);
  const selectedId = useRef(conversationId);
  const currentActor = useRef(actorId);
  const wasConnected = useRef(isSocketConnected);
  const inboxQueue = useRef<ReturnType<typeof createMessagingRefreshQueue> | null>(null);
  const messageRequests = useRef(new Map<string, Promise<void>>());
  const processedMessages = useRef(new Set<string>());
  const confirmedMessages = useRef(new Map<string, ConversationMessage>());
  const pendingSends = useRef(new Set<string>());
  const conversationsRef = useRef<ConversationSummary[]>([]);
  const conversationCursor = useRef<string | null>(null);
  const loadedOlderConversations = useRef(false);
  const olderConversationsRequest = useRef<Promise<void> | null>(null);
  const messageCursors = useRef(new Map<string, string | null>());
  const loadedOlderMessageThreads = useRef(new Set<string>());
  const olderMessageRequests = useRef(new Map<string, Promise<boolean>>());

  const publishConversations = useCallback((next: ConversationSummary[]) => {
    conversationsRef.current = next;
    setConversations(next);
  }, []);

  const updateConversations = useCallback((update: (current: ConversationSummary[]) => ConversationSummary[]) => {
    setConversations(current => {
      const next = update(current);
      conversationsRef.current = next;
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    selectedId.current = conversationId;
    currentActor.current = actorId;
    setHasOlderMessages(Boolean(conversationId && messageCursors.current.get(conversationId)));
    setLoadingOlderMessages(false);
    setLoadOlderMessagesError(null);
  }, [actorId, conversationId]);

  const updateMessages = useCallback((update: (current: LocalConversationMessage[]) => LocalConversationMessage[]) => {
    setThread(current => ({ id: conversationId, messages: update(current.id === conversationId ? current.messages : []) }));
  }, [conversationId]);

  useEffect(() => {
    mounted.current = true;
    const queue = createMessagingRefreshQueue(async () => {
      setError(null);
      try {
        const page = await getConversations();
        if (mounted.current) {
          const firstPageIds = new Set(page.conversations.map(item => item.id));
          const retained = loadedOlderConversations.current
            ? conversationsRef.current.filter(item => !firstPageIds.has(item.id))
            : [];
          publishConversations([...page.conversations, ...retained]);
          if (!loadedOlderConversations.current) {
            conversationCursor.current = page.nextCursor;
            setHasMoreConversations(Boolean(page.nextCursor));
          }
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }, err => { if (mounted.current) setError(requestError(err, 'Unable to load your inbox.')); });
    inboxQueue.current = queue;
    return () => { mounted.current = false; queue.dispose(); };
  }, [publishConversations]);

  useEffect(() => {
    if (sendRetryAfterSeconds <= 0) return undefined;
    const timer = setTimeout(() => setSendRetryAfterSeconds(current => Math.max(0, current - 1)), 1000);
    return () => clearTimeout(timer);
  }, [sendRetryAfterSeconds]);

  const refreshInbox = useCallback((options?: { force?: boolean }) => inboxQueue.current?.request(options) ?? Promise.resolve(), []);
  const isCurrent = useCallback(() => mounted.current && selectedId.current === conversationId && currentActor.current === actorId, [actorId, conversationId]);

  const loadMoreConversations = useCallback((): Promise<void> => {
    if (!mounted.current || !conversationCursor.current) return Promise.resolve();
    if (olderConversationsRequest.current) return olderConversationsRequest.current;
    setLoadingMoreConversations(true);
    setLoadMoreConversationsError(null);
    const cursor = conversationCursor.current;
    const request = getConversations(cursor).then(page => {
      if (!mounted.current) return;
      const existingIds = new Set(conversationsRef.current.map(item => item.id));
      const older = page.conversations.filter(item => !existingIds.has(item.id));
      publishConversations([...conversationsRef.current, ...older]);
      conversationCursor.current = page.nextCursor;
      loadedOlderConversations.current = true;
      setHasMoreConversations(Boolean(page.nextCursor));
    }).catch(err => {
      if (mounted.current) setLoadMoreConversationsError(requestError(err, 'Unable to load older conversations.'));
    }).finally(() => {
      olderConversationsRequest.current = null;
      if (mounted.current) setLoadingMoreConversations(false);
    });
    olderConversationsRequest.current = request;
    return request;
  }, [publishConversations]);

  const acknowledge = useCallback(async (id: string) => {
    try {
      await markConversationRead(id);
      if (isCurrent()) updateConversations(current => current.map(item => item.id === id ? { ...item, unreadCount: 0 } : item));
    } catch (err) {
      if (isCurrent()) setMessagesError(requestError(err, 'Unable to mark this conversation as read.'));
    }
  }, [isCurrent, updateConversations]);

  const refreshMessages = useCallback((): Promise<void> => {
    if (!conversationId) return Promise.resolve();
    const active = messageRequests.current.get(conversationId);
    if (active) return active;
    setMessagesError(null);
    setMessagesLoading(true);
    const request = getMessages(conversationId).then(async page => {
      if (!isCurrent()) return;
      updateMessages(current => mergeFetchedMessages(current, page.messages));
      if (!loadedOlderMessageThreads.current.has(conversationId)) {
        messageCursors.current.set(conversationId, page.nextCursor);
        setHasOlderMessages(Boolean(page.nextCursor));
      }
      for (const message of page.messages) processedMessages.current.add(identityOf(message));
      if (focused.current) await acknowledge(conversationId);
    }).catch(err => {
      if (isCurrent()) setMessagesError(requestError(err, 'Unable to load this conversation.'));
    }).finally(() => {
      messageRequests.current.delete(conversationId);
      if (isCurrent()) setMessagesLoading(false);
    });
    messageRequests.current.set(conversationId, request);
    return request;
  }, [acknowledge, conversationId, isCurrent, updateMessages]);

  const loadOlderMessages = useCallback((): Promise<boolean> => {
    if (!conversationId || !isCurrent()) return Promise.resolve(false);
    const active = olderMessageRequests.current.get(conversationId);
    if (active) return active;
    const cursor = messageCursors.current.get(conversationId);
    if (!cursor) return Promise.resolve(false);
    setLoadingOlderMessages(true);
    setLoadOlderMessagesError(null);
    const request = getMessages(conversationId, cursor).then(page => {
      if (!isCurrent()) return false;
      updateMessages(current => mergeFetchedMessages(current, page.messages));
      for (const message of page.messages) processedMessages.current.add(identityOf(message));
      messageCursors.current.set(conversationId, page.nextCursor);
      loadedOlderMessageThreads.current.add(conversationId);
      setHasOlderMessages(Boolean(page.nextCursor));
      return page.messages.length > 0;
    }).catch(err => {
      if (isCurrent()) setLoadOlderMessagesError(requestError(err, 'Unable to load older messages.'));
      return false;
    }).finally(() => {
      olderMessageRequests.current.delete(conversationId);
      if (isCurrent()) setLoadingOlderMessages(false);
    });
    olderMessageRequests.current.set(conversationId, request);
    return request;
  }, [conversationId, isCurrent, updateMessages]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void refreshInbox({ force: true });
    if (conversationId) void refreshMessages();
    return () => { focused.current = false; };
  }, [conversationId, refreshInbox, refreshMessages]));

  useEffect(() => {
    const onRead = (payload: ReadEvent) => {
      if (payload.userId === actorId) updateConversations(current => current.map(item => item.id === payload.conversationId ? { ...item, unreadCount: 0 } : item));
      void refreshInbox();
    };
    const onMessage = (payload: { conversationId: string; message: ConversationMessage }) => {
      const message = payload.message;
      const identity = identityOf(message);
      if (processedMessages.current.has(identity)) return;
      processedMessages.current.add(identity);
      if (message.sender.id === actorId) confirmedMessages.current.set(message.clientMessageId, message);
      if (payload.conversationId === conversationId) {
        updateMessages(current => mergeFetchedMessages(current, [{ ...message, animateEntry: true, localStatus: message.sender.id === actorId ? 'sent' : undefined }]));
        if (focused.current && message.sender.id !== actorId) void acknowledge(payload.conversationId);
      }
      void refreshInbox();
    };
    const onUpdate = (payload: Partial<ReadEvent>) => {
      if (payload.conversationId && payload.userId && payload.readAt) onRead(payload as ReadEvent);
      else void refreshInbox();
    };
    const removeMessage = subscribeToSocketEvent('conversation-message', onMessage);
    const removeUpdate = subscribeToSocketEvent('conversation-updated', onUpdate);
    const removeRead = subscribeToSocketEvent('conversation-read', onRead);
    return () => { removeMessage(); removeUpdate(); removeRead(); };
  }, [acknowledge, actorId, conversationId, isSocketConnected, refreshInbox, subscribeToSocketEvent, updateConversations, updateMessages]);

  useEffect(() => {
    if (isSocketConnected && !wasConnected.current && focused.current) {
      void refreshInbox({ force: true });
      if (conversationId) void refreshMessages();
    }
    wasConnected.current = isSocketConnected;
  }, [conversationId, isSocketConnected, refreshInbox, refreshMessages]);

  const send = useCallback(async (body: string, existingClientMessageId?: string) => {
    if (!conversationId) throw new Error('Conversation is not selected.');
    if (sendRetryAfterSeconds > 0) return undefined;
    const clientMessageId = existingClientMessageId || createClientMessageId();
    if (pendingSends.current.has(clientMessageId)) return undefined;
    pendingSends.current.add(clientMessageId);
    setSendError(null);
    updateMessages(current => {
      const existing = current.find(item => item.sender.id === actorId && item.clientMessageId === clientMessageId);
      const local: LocalConversationMessage = {
        id: 'local-' + clientMessageId, conversationId, clientMessageId, body,
        sender: { id: actorId, name: 'You', role: 'rider' }, createdAt: new Date().toISOString(),
        readAt: null, localStatus: 'pending', animateEntry: true,
      };
      return existing ? current.map(item => item === existing ? { ...item, localStatus: 'pending' } : item) : mergeFetchedMessages(current, [local]);
    });
    try {
      const saved = await sendMessage(conversationId, body, clientMessageId);
      confirmedMessages.current.set(clientMessageId, saved);
      if (isCurrent()) updateMessages(current => mergeFetchedMessages(current, [{ ...saved, localStatus: 'sent' }]));
      void refreshInbox();
      return saved;
    } catch (err) {
      const confirmed = confirmedMessages.current.get(clientMessageId);
      if (confirmed) return confirmed;
      if (isCurrent()) {
        updateMessages(current => current.map(item => item.clientMessageId === clientMessageId && item.sender.id === actorId ? { ...item, localStatus: 'failed' } : item));
        setSendError(getMessagingErrorMessage(err));
        const status = (err as { response?: { status?: number } })?.response?.status;
        setSendRetryAfterSeconds(status === 429 ? getMessagingRetryAfterSeconds(err) : 0);
      }
      return undefined;
    } finally {
      pendingSends.current.delete(clientMessageId);
    }
  }, [actorId, conversationId, isCurrent, refreshInbox, sendRetryAfterSeconds, updateMessages]);

  const retry = useCallback((message: LocalConversationMessage) => send(message.body, message.clientMessageId), [send]);
  const selectedConversation = useMemo(() => conversations.find(item => item.id === conversationId), [conversationId, conversations]);
  return { conversations, hasMoreConversations, loadingMoreConversations, loadMoreConversationsError, loadMoreConversations, selectedConversation, messages, loading, messagesLoading, hasOlderMessages, loadingOlderMessages, loadOlderMessagesError, loadOlderMessages, error, messagesError, sendError, sendRetryAfterSeconds, refreshInbox, refreshMessages, send, retry };
};
