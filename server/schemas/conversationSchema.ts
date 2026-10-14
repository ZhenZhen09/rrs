import { z } from 'zod';

const id = z.string().trim().min(1).max(191);

export const listConversationsQuerySchema = z.object({
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const requestConversationSchema = z.object({
  requestId: id,
}).strict();

export const listMessagesQuerySchema = z.object({
  before: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createMessageSchema = z.object({
  clientMessageId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
}).strict();

export const conversationIdSchema = id;
