import { api } from '@/utils/api';
import { ConversationPage, ConversationMessage, MessagePage } from '@/types/messaging';

export const getConversations = async (cursor?: string | null): Promise<ConversationPage> => {
  const response = await api.get('/api/conversations', { params: { cursor: cursor || undefined, limit: 30 } });
  return response.data;
};

export const getMessages = async (conversationId: string, before?: string | null): Promise<MessagePage> => {
  const response = await api.get(`/api/conversations/${conversationId}/messages`, {
    params: { before: before || undefined, limit: 50 },
  });
  return response.data;
};

export const sendMessage = async (conversationId: string, body: string, clientMessageId: string): Promise<ConversationMessage> => {
  const response = await api.post(`/api/conversations/${conversationId}/messages`, {
    body,
    clientMessageId,
  });
  return response.data;
};

export const markConversationRead = async (conversationId: string) => {
  await api.put(`/api/conversations/${conversationId}/read`);
};
