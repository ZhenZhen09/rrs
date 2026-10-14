import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Inbox, Loader2, MessageCircle, Plus, RefreshCw, Send, UserRound } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { useRealTime } from '../../context/RealTimeContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Textarea } from '../../components/ui/textarea';
import type { ConversationMessage, ConversationPage, ConversationSummary, MessagePage } from '../../types/messaging';
import { applyConversationRead, mergeConversationMessage, mergeFetchedAdminMessages, receiveAdminMessage, recordAdminMessage, subscribeAdminMessaging, totalUnreadConversations } from '../../utils/messaging';
import type { ConversationMessageEvent, ConversationReadEvent } from '../../utils/messaging';
import { cn } from '../../components/ui/utils';
import { useIsMobile } from '../../components/ui/use-mobile';
import { createClientMessageId } from '../../utils/clientId';

function formatMessageDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatSummaryDate(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatMessageDate(value);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function requestLabel(conversation: ConversationSummary): string {
  return `Request #${conversation.requestId.slice(-8).toUpperCase()}`;
}

async function getErrorMessage(response: Response | null, fallback: string): Promise<never> {
  const data = await response?.json().catch(() => null);
  throw new Error(data?.error || fallback);
}

function ConversationRow({
  conversation,
  active,
  online,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  online: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'w-full min-h-[92px] border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
        active && 'bg-primary/[0.06] shadow-[inset_3px_0_0_theme(colors.primary.DEFAULT)]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
          {conversation.rider.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-black text-slate-900">{conversation.rider.name}</p>
            <span className={cn('h-2 w-2 shrink-0 rounded-full', online ? 'bg-emerald-500' : 'bg-slate-300')} aria-label={online ? 'Online' : 'Offline'} title={online ? 'Online' : 'Offline'} />
          </div>
            <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatSummaryDate(conversation.lastMessageAt)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn('shrink-0 text-[10px] font-semibold', online ? 'text-emerald-600' : 'text-slate-400')}>{online ? 'Online' : 'Offline'}</span>
            {conversation.unreadCount > 0 && <Badge className="h-5 min-w-5 justify-center rounded-full bg-primary px-1.5 text-[10px]">{conversation.unreadCount}</Badge>}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage?.body || 'No messages yet'}</p>
        </div>
      </div>
    </button>
  );
}

function ConversationDetail({
  conversation,
  messages,
  loading,
  error,
  draft,
  sending,
  sendError,
  onDraftChange,
  onSend,
  onRetry,
  onBack,
  mobile = false,
  liveMessageIds,
  onBubbleShown,
  hasOlderMessages,
  loadingOlderMessages,
  olderMessagesError,
  onLoadOlderMessages,
}: {
  conversation: ConversationSummary | null;
  messages: ConversationMessage[];
  loading: boolean;
  error: string | null;
  draft: string;
  sending: boolean;
  sendError: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onBack?: () => void;
  mobile?: boolean;
  liveMessageIds: ReadonlySet<string>;
  onBubbleShown: (id: string) => void;
  hasOlderMessages: boolean;
  loadingOlderMessages: boolean;
  olderMessagesError: string | null;
  onLoadOlderMessages: () => Promise<boolean>;
}) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestoreRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    const restore = pendingScrollRestoreRef.current;
    if (restore) {
      messageList.scrollTop = restore.scrollTop + (messageList.scrollHeight - restore.scrollHeight);
      pendingScrollRestoreRef.current = null;
      return;
    }
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages.length, conversation?.id]);

  const loadOlderMessages = () => {
    const messageList = messageListRef.current;
    if (messageList) pendingScrollRestoreRef.current = { scrollTop: messageList.scrollTop, scrollHeight: messageList.scrollHeight };
    void onLoadOlderMessages().then(loaded => {
      if (!loaded) pendingScrollRestoreRef.current = null;
    });
  };

  if (!conversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-slate-50/60 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm"><MessageCircle className="h-7 w-7" /></div>
        <h2 className="text-base font-black text-slate-900">Select a conversation</h2>
        <p className="mt-1 max-w-xs text-sm text-slate-500">Choose a request thread to see the rider’s latest updates.</p>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-slate-50/70', mobile && 'h-full')}>
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-5 md:pt-4">
        <div className="flex items-center gap-3">
          {onBack && <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations" className="h-10 w-10 shrink-0 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-white">{conversation.rider.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black text-slate-900">{conversation.rider.name}</h2>
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">{requestLabel(conversation)} · {conversation.request.deliveryStatus?.replace(/_/g, ' ') || 'Open'}</p>
          </div>
          <Badge variant="outline" className="hidden shrink-0 border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase text-emerald-700 sm:inline-flex">{conversation.status}</Badge>
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-bold">{conversation.request.pickupAddress || 'Pickup not provided'}</span>
          <span className="mx-2 text-slate-300">→</span>
          <span>{conversation.request.dropoffAddress || 'Drop-off not provided'}</span>
        </div>
      </div>

      <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 md:px-6" aria-live="polite">
        {hasOlderMessages && (
          <div className="flex flex-col items-center gap-1 py-1">
            <Button type="button" variant="ghost" size="sm" onClick={loadOlderMessages} disabled={loadingOlderMessages} className="min-h-10 rounded-xl px-4 text-xs font-bold text-slate-600">
              {loadingOlderMessages ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading older messages</> : 'Load older messages'}
            </Button>
            {olderMessagesError && <p role="alert" className="text-xs font-semibold text-rose-600">{olderMessagesError}</p>}
          </div>
        )}
        {loading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Loading messages</span></div>
        ) : error ? (
          <div className="m-auto max-w-sm rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center text-sm text-rose-700"><p>{error}</p><Button variant="outline" size="sm" onClick={onRetry} className="mt-3 rounded-xl border-rose-200 bg-white">Try again</Button></div>
        ) : messages.length === 0 ? (
          <div className="m-auto max-w-sm text-center"><p className="text-sm font-bold text-slate-500">No messages in this thread yet.</p><p className="mt-1 text-xs text-slate-400">Send a quick update to the rider below.</p></div>
        ) : messages.map((message) => {
          const mine = message.sender.role === 'admin';
          return (
            <motion.div key={message.id}
              initial={liveMessageIds.has(message.id) && !reducedMotion ? { opacity: 0, y: 6, scale: 0.98 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => onBubbleShown(message.id)}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%]', mine ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800')}>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                <div className={cn('mt-1.5 flex items-center justify-end gap-1 text-[10px] font-bold', mine ? 'text-slate-400' : 'text-slate-400')}>
                  <span>{formatMessageDate(message.createdAt)}</span>
                  {mine && <span className="relative inline-flex h-3 w-3"><AnimatePresence initial={false}>
                    <motion.span key={message.readAt ? 'read' : 'sent'} className="absolute inset-0 inline-flex"
                      initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.18 }}>
                      {message.readAt ? <CheckCheck className="h-3 w-3 text-primary" aria-label="Read" /> : <Check className="h-3 w-3" aria-label="Sent" />}
                    </motion.span>
                  </AnimatePresence></span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:px-5 md:pb-4">
        {sendError && <p className="mb-2 text-xs font-bold text-rose-600" role="alert">{sendError}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend(); } }}
            placeholder="Write an update to the rider…"
            aria-label="Message to rider"
            disabled={sending || conversation.status !== 'open'}
            className="max-h-32 min-h-11 resize-none rounded-2xl border-slate-200 bg-slate-50 py-3 text-sm focus-visible:ring-primary"
            rows={1}
          />
          <motion.div className="shrink-0" whileTap={{ scale: reducedMotion || sending || !draft.trim() || conversation.status !== 'open' ? 1 : 0.94 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
          <Button type="button" onClick={onSend} disabled={sending || !draft.trim() || conversation.status !== 'open'} aria-label="Send message" className="h-11 w-11 shrink-0 rounded-2xl p-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          </motion.div>
        </div>
        {conversation.status !== 'open' && <p className="mt-2 text-[11px] font-bold text-slate-400">This conversation is closed and read-only.</p>}
      </div>
    </div>
  );
}

export function AdminMessaging({
  initialConversationId = null,
  onInitialConversationOpened,
}: {
  initialConversationId?: string | null;
  onInitialConversationOpened?: () => void;
}) {
  const { user } = useAuth();
  return <AdminMessagingContent
    key={user?.id || 'signed-out'}
    actorId={user?.id || ''}
    initialConversationId={initialConversationId}
    onInitialConversationOpened={onInitialConversationOpened}
  />;
}

function AdminMessagingContent({
  actorId,
  initialConversationId,
  onInitialConversationOpened,
}: {
  actorId: string;
  initialConversationId: string | null;
  onInitialConversationOpened?: () => void;
}) {
  const { fetchWithAuth, requests } = useData();
  const { socket, riderPresence } = useRealTime();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [olderConversationsError, setOlderConversationsError] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [startingRequestId, setStartingRequestId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const viewRef = useRef({ isMobile, mobileOpen, reducedMotion });
  useEffect(() => { viewRef.current = { isMobile, mobileOpen, reducedMotion }; }, [isMobile, mobileOpen, reducedMotion]);
  const [liveMessageIds, setLiveMessageIds] = useState<ReadonlySet<string>>(() => new Set());
  // Each account owns its deduplication and in-flight work. Old callbacks cannot
  // publish into a replacement account or a later selection of the same thread.
  const runtimeRef = useRef({
    disposed: false,
    selectedId: null as string | null,
    selectionVersion: 0,
    conversations: [] as ConversationSummary[],
    threads: new Map<string, ConversationMessage[]>(),
    seen: new Map<string, Set<string>>(),
    counted: new Map<string, Set<string>>(),
    acknowledged: new Set<string>(),
    liveMessageIds: new Set<string>(),
    revision: 0,
    summaryRevisions: new Map<string, number>(),
    inboxPromise: null as Promise<void> | null,
    inboxPending: false,
    conversationCursor: null as string | null,
    hasLoadedOlderConversations: false,
    olderInboxPromise: null as Promise<void> | null,
    threadPromises: new Map<string, { version: number; promise: Promise<void> }>(),
    messageCursors: new Map<string, string | null>(),
    loadedOlderMessageThreads: new Set<string>(),
    olderThreadPromises: new Map<string, Promise<boolean>>(),
  });
  const isCurrent = useCallback(() => !runtimeRef.current.disposed, []);
  const visibleConversationId = useCallback(() => !viewRef.current.isMobile || viewRef.current.mobileOpen ? runtimeRef.current.selectedId : null, []);

  const publishConversations = useCallback((next: ConversationSummary[], changedId: string) => {
    const runtime = runtimeRef.current;
    runtime.conversations = next;
    runtime.summaryRevisions.set(changedId, ++runtime.revision);
    setConversations(next);
  }, []);

  const acknowledge = useCallback(async (conversationId: string, messageKey: string) => {
    const runtime = runtimeRef.current;
    const key = `${conversationId}:${messageKey}`;
    if (!isCurrent() || visibleConversationId() !== conversationId || runtime.acknowledged.has(key)) return;
    runtime.acknowledged.add(key);
    const version = runtime.selectionVersion;
    try {
      const response = await fetchWithAuth(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'PUT' });
      if (!response?.ok) await getErrorMessage(response, 'Unable to mark conversation read.');
      if (!isCurrent() || visibleConversationId() !== conversationId || runtime.selectionVersion !== version) return;
      publishConversations(applyConversationRead(runtime.conversations, { conversationId, userId: actorId, readAt: '' }, actorId), conversationId);
    } catch (caught) {
      runtime.acknowledged.delete(key);
      if (isCurrent() && runtime.selectedId === conversationId && runtime.selectionVersion === version) setMessagesError(caught instanceof Error ? caught.message : 'Unable to mark conversation read.');
    }
  }, [actorId, fetchWithAuth, isCurrent, publishConversations, visibleConversationId]);

  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedId) || null, [conversations, selectedId]);

  const fetchConversations = useCallback(function refreshInbox(trailing = false): Promise<void> {
    const runtime = runtimeRef.current;
    if (!isCurrent()) return Promise.resolve();
    if (runtime.inboxPromise) {
      if (trailing) runtime.inboxPending = true;
      return runtime.inboxPromise;
    }
    const startedRevision = runtime.revision;
    let succeeded = false;
    const promise = (async () => {
      try {
        const response = await fetchWithAuth('/api/conversations?limit=50');
        if (!response?.ok) await getErrorMessage(response, 'Unable to load conversations.');
        const data = await response!.json() as ConversationPage;
        if (!isCurrent()) return;
        const changed = runtime.conversations.filter(item => (runtime.summaryRevisions.get(item.id) || 0) > startedRevision);
        const changedIds = new Set(changed.map(item => item.id));
        const fetched = (data.conversations || []).filter(item => !changedIds.has(item.id));
        const visibleIds = new Set([...changed, ...fetched].map(item => item.id));
        const previouslyLoadedOlder = runtime.hasLoadedOlderConversations
          ? runtime.conversations.filter(item => !visibleIds.has(item.id))
          : [];
        runtime.conversations = [...changed, ...fetched, ...previouslyLoadedOlder]
          .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt) || right.id.localeCompare(left.id));
        if (!runtime.hasLoadedOlderConversations) {
          runtime.conversationCursor = data.nextCursor;
          setHasMoreConversations(Boolean(data.nextCursor));
        }
        fetched.forEach(item => { if (item.lastMessage) recordAdminMessage(runtime.counted, item.lastMessage); });
        setConversations(runtime.conversations);
        setError(null);
        succeeded = true;
      } catch (caught) {
        if (isCurrent()) setError(caught instanceof Error ? caught.message : 'Unable to load conversations.');
      } finally {
        runtime.inboxPromise = null;
        const pending = runtime.inboxPending;
        runtime.inboxPending = false;
        if (isCurrent()) {
          setLoading(false);
          if (succeeded && pending) void refreshInbox();
        }
      }
    })();
    runtime.inboxPromise = promise;
    return promise;
  }, [fetchWithAuth, isCurrent]);

  const loadMoreConversations = useCallback((): Promise<void> => {
    const runtime = runtimeRef.current;
    if (!isCurrent() || !runtime.conversationCursor) return Promise.resolve();
    if (runtime.olderInboxPromise) return runtime.olderInboxPromise;
    setLoadingMoreConversations(true);
    setOlderConversationsError(null);
    const cursor = runtime.conversationCursor;
    const promise = (async () => {
      try {
        const response = await fetchWithAuth(`/api/conversations?limit=50&cursor=${encodeURIComponent(cursor)}`);
        if (!response?.ok) await getErrorMessage(response, 'Unable to load older conversations.');
        const page = await response!.json() as ConversationPage;
        if (!isCurrent()) return;
        const existingIds = new Set(runtime.conversations.map(item => item.id));
        const older = (page.conversations || []).filter(item => !existingIds.has(item.id));
        older.forEach(item => { if (item.lastMessage) recordAdminMessage(runtime.counted, item.lastMessage); });
        runtime.conversations = [...runtime.conversations, ...older]
          .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt) || right.id.localeCompare(left.id));
        runtime.conversationCursor = page.nextCursor;
        runtime.hasLoadedOlderConversations = true;
        setConversations(runtime.conversations);
        setHasMoreConversations(Boolean(page.nextCursor));
      } catch (caught) {
        if (isCurrent()) setOlderConversationsError(caught instanceof Error ? caught.message : 'Unable to load older conversations.');
      } finally {
        runtime.olderInboxPromise = null;
        if (isCurrent()) setLoadingMoreConversations(false);
      }
    })();
    runtime.olderInboxPromise = promise;
    return promise;
  }, [fetchWithAuth, isCurrent]);

  const fetchMessages = useCallback((conversationId: string): Promise<void> => {
    const runtime = runtimeRef.current;
    if (!isCurrent() || runtime.selectedId !== conversationId) return Promise.resolve();
    const version = runtime.selectionVersion;
    const existing = runtime.threadPromises.get(conversationId);
    if (existing?.version === version) return existing.promise;
    const currentSelection = () => isCurrent() && runtime.selectedId === conversationId && runtime.selectionVersion === version;
    runtime.liveMessageIds.clear();
    const promise = (async () => {
      try {
        const response = await fetchWithAuth(`/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`);
        if (!response?.ok) await getErrorMessage(response, 'Unable to load messages.');
        const data = await response!.json() as MessagePage;
        if (!currentSelection()) return;
        const fetched = (data.messages || []).slice().reverse();
        if (!runtime.loadedOlderMessageThreads.has(conversationId)) {
          runtime.messageCursors.set(conversationId, data.nextCursor);
          setHasOlderMessages(Boolean(data.nextCursor));
        }
        const merged = mergeFetchedAdminMessages(runtime.threads.get(conversationId) || [], fetched);
        fetched.forEach(message => { recordAdminMessage(runtime.seen, message); recordAdminMessage(runtime.counted, message); });
        runtime.threads.set(conversationId, merged);
        setMessagesError(null);
        setLiveMessageIds(new Set(runtime.liveMessageIds));
        setMessages(merged);
        const incoming = [...merged].reverse().find(message => message.sender.id !== actorId);
        if (incoming) void acknowledge(conversationId, `${incoming.sender.id}:${incoming.clientMessageId || incoming.id}`);
      } catch (caught) {
        if (currentSelection()) setMessagesError(caught instanceof Error ? caught.message : 'Unable to load messages.');
      } finally {
        if (runtime.threadPromises.get(conversationId)?.version === version) runtime.threadPromises.delete(conversationId);
        if (currentSelection()) setMessagesLoading(false);
      }
    })();
    runtime.threadPromises.set(conversationId, { version, promise });
    return promise;
  }, [acknowledge, actorId, fetchWithAuth, isCurrent]);

  const loadOlderMessages = useCallback((conversationId: string): Promise<boolean> => {
    const runtime = runtimeRef.current;
    if (!isCurrent() || runtime.selectedId !== conversationId) return Promise.resolve(false);
    const active = runtime.olderThreadPromises.get(conversationId);
    if (active) return active;
    const cursor = runtime.messageCursors.get(conversationId);
    if (!cursor) return Promise.resolve(false);
    const version = runtime.selectionVersion;
    const currentSelection = () => isCurrent() && runtime.selectedId === conversationId && runtime.selectionVersion === version;
    setLoadingOlderMessages(true);
    setOlderMessagesError(null);
    const promise = (async () => {
      try {
        const response = await fetchWithAuth(`/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=100&before=${encodeURIComponent(cursor)}`);
        if (!response?.ok) await getErrorMessage(response, 'Unable to load older messages.');
        const page = await response!.json() as MessagePage;
        if (!currentSelection()) return false;
        const older = (page.messages || []).slice().reverse();
        const currentMessages = runtime.threads.get(conversationId) || [];
        const merged = mergeFetchedAdminMessages(currentMessages, older);
        older.forEach(message => { recordAdminMessage(runtime.seen, message); recordAdminMessage(runtime.counted, message); });
        runtime.threads.set(conversationId, merged);
        runtime.messageCursors.set(conversationId, page.nextCursor);
        runtime.loadedOlderMessageThreads.add(conversationId);
        setHasOlderMessages(Boolean(page.nextCursor));
        setMessages(merged);
        return merged.length > currentMessages.length;
      } catch (caught) {
        if (currentSelection()) setOlderMessagesError(caught instanceof Error ? caught.message : 'Unable to load older messages.');
        return false;
      } finally {
        runtime.olderThreadPromises.delete(conversationId);
        if (currentSelection()) setLoadingOlderMessages(false);
      }
    })();
    runtime.olderThreadPromises.set(conversationId, promise);
    return promise;
  }, [fetchWithAuth, isCurrent]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    runtime.disposed = false;
    void fetchConversations();
    return () => { runtime.disposed = true; runtime.inboxPending = false; };
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId && (!isMobile || mobileOpen)) void fetchMessages(selectedId);
  }, [selectedId, isMobile, mobileOpen, fetchMessages]);

  const upsertMessage = useCallback((message: ConversationMessage, animate: boolean) => {
    const runtime = runtimeRef.current;
    const current = runtime.threads.get(message.conversationId) || [];
    const next = mergeFetchedAdminMessages([message], current);
    runtime.threads.set(message.conversationId, next);
    if (runtime.selectedId === message.conversationId) {
      if (animate && visibleConversationId() === message.conversationId && !viewRef.current.reducedMotion) {
        runtime.liveMessageIds.add(message.id);
        setLiveMessageIds(new Set(runtime.liveMessageIds));
      }
      setMessages(next);
    }
  }, [visibleConversationId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!socket || !actorId) return;
    const handleMessage = (payload: ConversationMessageEvent) => {
      if (!isCurrent() || payload.conversationId !== payload.message.conversationId) return;
      const received = receiveAdminMessage(runtime.conversations, payload.message, visibleConversationId(), actorId, runtime.seen, runtime.counted);
      upsertMessage(payload.message, received.unique);
      const known = runtime.conversations.find(item => item.id === payload.conversationId);
      if (!known) void fetchConversations(true);
      else if (received.unique) publishConversations(received.conversations, known.id);
      if (received.shouldAcknowledge) {
        void acknowledge(payload.conversationId, `${payload.message.sender.id}:${payload.message.clientMessageId || payload.message.id}`);
      }
    };
    const cleanup = subscribeAdminMessaging(socket, {
      onMessage: handleMessage,
      onRead: (payload: ConversationReadEvent) => {
        if (isCurrent() && payload.userId === actorId) publishConversations(applyConversationRead(runtime.conversations, payload, actorId), payload.conversationId);
      },
      onMetadata: payload => {
        if (!isCurrent()) return;
        const known = runtime.conversations.find(item => item.id === payload.conversationId);
        if (!known) { void fetchConversations(true); return; }
        if (payload.lastMessage?.conversationId === payload.conversationId) {
          const next = mergeConversationMessage(runtime.conversations, payload.lastMessage, payload.conversationId, actorId);
          publishConversations(next.map(item => item.id === known.id ? { ...item, unreadCount: known.unreadCount } : item), known.id);
        }
      },
      onConnect: () => {
        if (!isCurrent()) return;
        void fetchConversations(true);
        const visible = visibleConversationId();
        if (visible) void fetchMessages(visible);
      },
    });
    return () => {
      cleanup();
      runtime.inboxPending = false;
    };
  }, [acknowledge, actorId, fetchConversations, fetchMessages, isCurrent, publishConversations, socket, upsertMessage, visibleConversationId]);

  const selectConversation = useCallback((conversationId: string) => {
    const runtime = runtimeRef.current;
    if (runtime.selectedId !== conversationId || (viewRef.current.isMobile && !viewRef.current.mobileOpen)) setMessagesLoading(true);
    if (runtime.selectedId !== conversationId) {
      runtime.selectedId = conversationId;
      runtime.selectionVersion++;
      runtime.liveMessageIds.clear();
      setLiveMessageIds(new Set());
      setMessages(runtime.threads.get(conversationId) || []);
      setMessagesError(null);
      setHasOlderMessages(Boolean(runtime.messageCursors.get(conversationId)));
      setLoadingOlderMessages(false);
      setOlderMessagesError(null);
      setDraft('');
      setSendError(null);
    }
    viewRef.current.mobileOpen = true;
    setSelectedId(conversationId);
    setMobileOpen(true);
  }, []);

  const handledInitialConversationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialConversationId || handledInitialConversationRef.current === initialConversationId) return;
    if (!conversations.some(conversation => conversation.id === initialConversationId)) return;
    handledInitialConversationRef.current = initialConversationId;
    selectConversation(initialConversationId);
    onInitialConversationOpened?.();
  }, [conversations, initialConversationId, onInitialConversationOpened, selectConversation]);

  const startConversation = async (requestId: string) => {
    const runtime = runtimeRef.current;
    if (startingRequestId) return;
    setStartingRequestId(requestId);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ requestId }),
      });
      if (!response?.ok) await getErrorMessage(response, 'Unable to start conversation.');
      const conversation = await response!.json() as ConversationSummary;
      if (!isCurrent()) return;
      publishConversations([conversation, ...runtime.conversations.filter((item) => item.id !== conversation.id)], conversation.id);
      selectConversation(conversation.id);
    } catch (caught) {
      if (isCurrent()) setError(caught instanceof Error ? caught.message : 'Unable to start conversation.');
    } finally {
      if (isCurrent()) setStartingRequestId(null);
    }
  };

  const sendMessage = async () => {
    const runtime = runtimeRef.current;
    if (!selectedConversation || !draft.trim() || sending) return;
    const body = draft.trim();
    const conversationId = selectedConversation.id;
    const version = runtime.selectionVersion;
    setSending(true);
    setSendError(null);
    try {
      const response = await fetchWithAuth(`/api/conversations/${encodeURIComponent(selectedConversation.id)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ clientMessageId: createClientMessageId(), body }),
      });
      if (!response?.ok) await getErrorMessage(response, 'Unable to send message.');
      const message = await response!.json() as ConversationMessage;
      if (!isCurrent()) return;
      const unique = recordAdminMessage(runtime.seen, message);
      upsertMessage(message, unique);
      if (unique) publishConversations(mergeConversationMessage(runtime.conversations, message, visibleConversationId(), actorId), conversationId);
      if (runtime.selectedId === conversationId && runtime.selectionVersion === version) setDraft('');
    } catch (caught) {
      if (isCurrent() && runtime.selectedId === conversationId && runtime.selectionVersion === version) setSendError(caught instanceof Error ? caught.message : 'Unable to send message.');
    } finally {
      if (isCurrent()) setSending(false);
    }
  };

  const detailProps = {
    conversation: selectedConversation,
    messages,
    loading: messagesLoading,
    error: messagesError,
    draft,
    sending,
    sendError,
    onDraftChange: setDraft,
    onSend: sendMessage,
    onRetry: () => {
      if (selectedId) { setMessagesError(null); setMessagesLoading(true); void fetchMessages(selectedId); }
    },
    liveMessageIds,
    hasOlderMessages,
    loadingOlderMessages,
    olderMessagesError,
    onLoadOlderMessages: () => selectedId ? loadOlderMessages(selectedId) : Promise.resolve(false),
    onBubbleShown: (id: string) => {
      if (runtimeRef.current.liveMessageIds.delete(id)) setLiveMessageIds(new Set(runtimeRef.current.liveMessageIds));
    },
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-4 md:px-6">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Operations</p><h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">Inbox</h1></div>
        <div className="flex items-center gap-2"><Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary"><Inbox className="mr-1.5 h-3.5 w-3.5" />{totalUnreadConversations(conversations)} unread</Badge><Button variant="ghost" size="icon" onClick={() => void fetchConversations()} aria-label="Refresh inbox" className="h-10 w-10 rounded-xl"><RefreshCw className="h-4 w-4" /></Button></div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-full min-w-0 flex-col overflow-hidden border-r border-slate-100 md:w-[min(24rem,38%)] lg:w-[22rem]">
          <div className="flex shrink-0 items-center justify-between px-4 py-3"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Conversations</p><span className="text-xs font-bold text-slate-400">{conversations.length}</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading inbox…</div> : error ? <div className="p-4 text-center"><p className="text-sm font-bold text-rose-600">{error}</p><Button variant="outline" size="sm" onClick={() => void fetchConversations()} className="mt-3 rounded-xl">Try again</Button></div> : conversations.length === 0 ? <div className="p-5"><Card className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-dashed text-slate-300"><UserRound className="h-6 w-6" /></Card><p className="mt-4 text-center text-sm font-black text-slate-700">Start a conversation</p><p className="mt-1 text-center text-xs text-slate-400">Choose an assigned delivery request to message its rider.</p><div className="mt-4 space-y-2">{requests.filter((request) => Boolean(request.assigned_rider_id) && !['completed', 'failed', 'cancelled', 'disapproved'].includes(String(request.delivery_status))).slice(0, 8).map((request) => <Button key={request.request_id} type="button" variant="outline" onClick={() => void startConversation(request.request_id)} disabled={startingRequestId !== null} className="h-auto w-full justify-between rounded-xl px-3 py-3 text-left"><span className="min-w-0"><span className="block truncate text-xs font-black">Request #{request.request_id.slice(-8).toUpperCase()}</span><span className="block truncate text-[11px] text-slate-500">{request.assigned_rider_name || 'Assigned rider'}</span></span>{startingRequestId === request.request_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>)}</div></div> : conversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} online={riderPresence[conversation.rider.id] === 'online'} active={conversation.id === selectedId} onSelect={() => selectConversation(conversation.id)} />)}
            {hasMoreConversations && (
              <div className="flex flex-col items-center gap-1 p-3">
                <Button type="button" variant="ghost" onClick={() => void loadMoreConversations()} disabled={loadingMoreConversations} className="min-h-10 rounded-xl px-4 text-xs font-bold text-slate-600">
                  {loadingMoreConversations ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading older conversations</> : 'Load older conversations'}
                </Button>
                {olderConversationsError && <p role="alert" className="text-center text-xs font-semibold text-rose-600">{olderConversationsError}</p>}
              </div>
            )}
          </div>
        </aside>
        {!isMobile && <section className="hidden min-w-0 flex-1 md:flex"><ConversationDetail {...detailProps} /></section>}
      </div>
      {isMobile && <Sheet open={mobileOpen} onOpenChange={open => { if (!open) runtimeRef.current.selectionVersion++; viewRef.current.mobileOpen = open; setMobileOpen(open); }}>
        <SheetContent side="right" overlayClassName="bg-transparent" className="h-[100dvh] w-full max-w-none gap-0 border-none p-0 sm:max-w-none md:hidden">
          <SheetHeader className="sr-only"><SheetTitle>Conversation with {selectedConversation?.rider.name || 'rider'}</SheetTitle><SheetDescription>View and send messages in this conversation.</SheetDescription></SheetHeader>
          <ConversationDetail {...detailProps} mobile onBack={() => { runtimeRef.current.selectionVersion++; viewRef.current.mobileOpen = false; setMobileOpen(false); }} />
        </SheetContent>
      </Sheet>}
    </div>
  );
}
