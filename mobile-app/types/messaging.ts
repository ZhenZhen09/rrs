export type ConversationStatus = 'open' | 'closed';
export type MessagingRole = 'admin' | 'rider';

export interface MessagingParticipant {
  id: string;
  name: string;
  role: MessagingRole;
}

export interface MessagingRequestSummary {
  id: string;
  type: string | null;
  deliveryStatus: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: MessagingParticipant;
  clientMessageId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationSummary {
  id: string;
  requestId: string;
  rider: MessagingParticipant;
  status: ConversationStatus;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  request: MessagingRequestSummary;
  lastMessage: ConversationMessage | null;
  unreadCount: number;
}

export interface MessagePage {
  messages: ConversationMessage[];
  nextCursor: string | null;
}

export interface ConversationPage {
  conversations: ConversationSummary[];
  nextCursor: string | null;
}

export interface CreateMessageInput {
  conversationId: string;
  clientMessageId: string;
  body: string;
}
