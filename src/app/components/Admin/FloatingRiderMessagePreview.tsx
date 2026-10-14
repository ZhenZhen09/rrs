import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { ConversationMessage } from '../../types/messaging';
import { getDefaultRiderAvatarUrl } from '../../utils/riderAvatar';
import { subscribeAdminRiderMessagePreview } from '../../utils/messaging';

type Props = {
  socket: Pick<Socket, 'on' | 'off'> | null;
  actorId: string;
  inboxActive: boolean;
  onOpenConversation: (conversationId: string) => void;
};

const MESSAGE_BUBBLE_DURATION_MS = 8_000;

export function FloatingRiderMessagePreview({ socket, actorId, inboxActive, onOpenConversation }: Props) {
  const [message, setMessage] = useState<ConversationMessage | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [exitToConversation, setExitToConversation] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const isInteracting = pointerInside || focusInside;
  const reducedMotion = useReducedMotion();
  const inboxActiveRef = useRef(inboxActive);
  const previousMessageId = useRef<string | null>(null);
  inboxActiveRef.current = inboxActive;

  useEffect(() => {
    if (!socket || !actorId) return;
    return subscribeAdminRiderMessagePreview(socket, actorId, incoming => {
      if (!inboxActiveRef.current) {
        setExitToConversation(false);
        setMessage(incoming);
        setExpanded(true);
      }
    });
  }, [actorId, socket]);

  useEffect(() => {
    if (inboxActive) {
      setMessage(null);
      setExpanded(false);
    }
  }, [inboxActive]);

  useEffect(() => {
    if (!message || !expanded || isInteracting) return;
    const timeout = window.setTimeout(() => setExpanded(false), MESSAGE_BUBBLE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [expanded, isInteracting, message?.id]);

  useEffect(() => {
    if (!message) {
      previousMessageId.current = null;
      setHighlighted(false);
      return;
    }
    const isUpdate = previousMessageId.current !== null && previousMessageId.current !== message.id;
    previousMessageId.current = message.id;
    if (!isUpdate || reducedMotion) return;
    setHighlighted(true);
    const timeout = window.setTimeout(() => setHighlighted(false), 320);
    return () => window.clearTimeout(timeout);
  }, [message, reducedMotion]);

  const dismiss = () => {
    setExitToConversation(false);
    setExpanded(false);
    setMessage(null);
  };

  const openConversation = () => {
    if (!message) return;
    const conversationId = message.conversationId;
    setExitToConversation(true);
    onOpenConversation(conversationId);
    setMessage(null);
    setExpanded(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[80] flex items-end justify-end md:bottom-6 md:right-6">
      {message && <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">New rider message from {message.sender.name}: {message.body}</span>}
      <AnimatePresence initial={false}>
        {message && (
          <motion.div
            key="rider-message-preview"
            data-testid="floating-rider-message-preview"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion
              ? { opacity: 0 }
              : exitToConversation ? { opacity: 0, x: 32 } : { opacity: 0, scale: 0.86, y: 8 }}
            transition={{ duration: reducedMotion ? 0.08 : 0.2, ease: 'easeOut' }}
            className="pointer-events-auto relative flex items-end gap-3"
            onPointerEnter={() => setPointerInside(true)}
            onPointerLeave={() => setPointerInside(false)}
            onFocusCapture={() => setFocusInside(true)}
            onBlurCapture={event => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setFocusInside(false);
            }}
          >
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.aside
                  key="rider-message-bubble"
                  aria-label={`New message from ${message.sender.name}: ${message.body}`}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 10, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 8, scale: 0.97 }}
                  transition={{ duration: reducedMotion ? 0.08 : 0.18, ease: 'easeOut' }}
                  className={`relative w-[min(19rem,calc(100vw-7rem))] rounded-2xl border bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.2)] ${highlighted ? 'border-primary/50 bg-primary/[0.06]' : 'border-slate-200'}`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    New rider message
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-bold text-slate-900">{message.sender.name}</span>
                  <button
                    type="button"
                    onClick={openConversation}
                    aria-label={`Open conversation with ${message.sender.name}. Latest message: ${message.body}`}
                    className="mt-0.5 block w-full truncate rounded text-left text-sm text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {message.body}
                  </button>
                  <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 border-r border-t border-slate-200 bg-white" aria-hidden="true" />
                </motion.aside>
              )}
            </AnimatePresence>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setExpanded(value => !value)}
                aria-label={`${expanded ? 'Hide' : 'Show'} latest message from ${message.sender.name}`}
                aria-expanded={expanded}
                className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.24)] outline-none transition-transform duration-200 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${highlighted ? 'border-primary' : 'border-white'}`}
              >
                <img
                  src={getDefaultRiderAvatarUrl(message.sender.avatarId || message.sender.id)}
                  alt={`${message.sender.name} avatar`}
                  className="h-full w-full rounded-full object-cover"
                  onError={(event) => { event.currentTarget.src = '/rider-avatars/avatar_01.png'; }}
                />
                <span
                  data-testid="rider-message-unread-dot"
                  className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-red-500 shadow-[0_0_0_1px_rgba(15,23,42,0.16)]"
                  aria-label="Unread message"
                  role="img"
                />
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label={`Dismiss message from ${message.sender.name}`}
                className="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
