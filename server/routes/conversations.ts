import { Router, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { sendPushNotification } from './notifications';
import { AuthRequest, authorize } from '../middleware/auth';
import {
  createMessage,
  getOrCreateRequestConversation,
  listConversations,
  listConversationDeliveryTargets,
  listMessages,
  markConversationRead,
  MessagingServiceError,
} from '../services/messaging';
import {
  conversationIdSchema,
  createMessageSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  requestConversationSchema,
} from '../schemas/conversationSchema';

const router = Router();
const participantRoles = authorize(['admin', 'rider']);
const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => (req as AuthRequest).user?.id || ipKeyGenerator(req.ip || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please try again later.' },
});

function parseOr400<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } }, value: unknown, res: Response): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid conversation request.', details: parsed.error });
    return null;
  }
  return parsed.data as T;
}

function sendServiceError(error: unknown, res: Response): void {
  if (error instanceof MessagingServiceError) {
    const status = error.code === 'FORBIDDEN' ? 403
      : error.code === 'NOT_FOUND' ? 404
        : error.code === 'CONVERSATION_CLOSED' ? 409
          : 400;
    res.status(status).json({ error: error.message, code: error.code });
    return;
  }
  console.error('[MESSAGING] Unable to process conversation request.');
  res.status(500).json({ error: 'Unable to process conversation request.' });
}

function emitDeliveryEvents(req: AuthRequest, userIds: string[], events: Array<{ event: string; payload: unknown }>): void {
  if (userIds.length === 0) return;
  try {
    const io = req.app.get('io');
    if (!io) return;
    for (const { event, payload } of events) io.to(userIds).emit(event, payload);
  } catch {
    // Error messages can contain message bodies, database details or tokens.
    console.warn('[MESSAGING] Realtime delivery failed after persistence.');
  }
}

router.use(participantRoles);

router.get('/', async (req: AuthRequest, res: Response) => {
  const input = parseOr400(listConversationsQuerySchema, req.query, res);
  if (!input) return;
  try {
    res.json(await listConversations(req.user!.id, input.cursor || null, input.limit));
  } catch (error) {
    sendServiceError(error, res);
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const input = parseOr400(requestConversationSchema, req.body, res);
  if (!input) return;
  try {
    res.status(201).json(await getOrCreateRequestConversation(input.requestId, req.user!.id));
  } catch (error) {
    sendServiceError(error, res);
  }
});

router.get('/:id/messages', async (req: AuthRequest, res: Response) => {
  const conversationId = parseOr400(conversationIdSchema, req.params.id, res);
  const input = parseOr400(listMessagesQuerySchema, req.query, res);
  if (!conversationId || !input) return;
  try {
    res.json(await listMessages(conversationId, req.user!.id, input.before || null, input.limit));
  } catch (error) {
    sendServiceError(error, res);
  }
});

router.post('/:id/messages', messageRateLimiter, async (req: AuthRequest, res: Response) => {
  const conversationId = parseOr400(conversationIdSchema, req.params.id, res);
  const input = parseOr400(createMessageSchema, req.body, res);
  if (!conversationId || !input) return;
  try {
    const message = await createMessage(req.user!.id, { ...input, conversationId });
    try {
      const targets = await listConversationDeliveryTargets(conversationId, req.user!.id);
      const userIds = [...new Set(targets.map(target => target.userId))];
      emitDeliveryEvents(req, userIds, [
        { event: 'conversation-message', payload: { conversationId, message } },
        { event: 'conversation-updated', payload: { conversationId, lastMessage: message } },
      ]);
      await Promise.all(targets.filter(target => target.userId !== req.user!.id).map(async target => {
        try {
          await sendPushNotification(
            target.userId,
            'New message',
            'You have a new conversation message.',
            { type: 'conversation_message', conversationId, messageId: message.id, requestId: target.requestId },
          );
        } catch {
          console.warn('[MESSAGING] Push delivery failed after message persistence.');
        }
      }));
    } catch {
      // A failed authorization lookup must never trigger a broad-room fallback.
      console.warn('[MESSAGING] Delivery target lookup failed after message persistence.');
    }
    res.status(201).json(message);
  } catch (error) {
    sendServiceError(error, res);
  }
});

router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  const conversationId = parseOr400(conversationIdSchema, req.params.id, res);
  if (!conversationId) return;
  try {
    const result = await markConversationRead(conversationId, req.user!.id);
    try {
      const targets = await listConversationDeliveryTargets(conversationId, req.user!.id);
      const userIds = [...new Set(targets.map(target => target.userId))];
      emitDeliveryEvents(req, userIds, [
        { event: 'conversation-read', payload: { conversationId, userId: req.user!.id, ...result } },
      ]);
    } catch {
      console.warn('[MESSAGING] Delivery target lookup failed after read persistence.');
    }
    res.json(result);
  } catch (error) {
    sendServiceError(error, res);
  }
});

export async function resolveRequestConversation(req: AuthRequest, res: Response): Promise<void> {
  const input = parseOr400(requestConversationSchema, { requestId: req.params.id }, res);
  if (!input) return;
  try {
    res.json(await getOrCreateRequestConversation(input.requestId, req.user!.id));
  } catch (error) {
    sendServiceError(error, res);
  }
}

export default router;
