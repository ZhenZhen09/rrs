# Admin–Rider Request Messaging Design

Date: 2026-10-02
Status: Draft for review

## Objective

Add a secure text-messaging inbox shared by the web admin console and the rider mobile app. Version 1 supports one conversation per delivery request between an admin-side user and the rider assigned to that request. Messages remain operationally tied to the request and do not become unrestricted direct messages.

## Scope

Included:

- Admin inbox and request-linked conversation view.
- Rider mobile inbox and conversation view.
- Text messages, timestamps, unread state, and read receipts.
- Real-time delivery through the existing Socket.IO connection.
- In-app notifications and Expo push notifications for offline recipients.
- Offline-safe client message IDs and retry behavior.
- Server-side participant and request authorization.
- Cursor-based message pagination.

Excluded from version 1:

- Group conversations.
- File/image attachments, reactions, editing, and deletion.
- Public/general rider-to-admin channels not linked to a request.
- End-to-end encryption beyond transport/database protections already used by the application.

## Existing System Integration

The feature will reuse:

- Existing JWT/cookie authentication and role middleware.
- Existing request ownership and assigned-rider relationships.
- Existing Socket.IO user rooms, `admin-room`, and request `job_<requestId>` rooms.
- Existing `notifications` table and notification endpoints.
- Existing Expo token registration and push notification service.
- Existing admin notification sheet and rider notification refresh flow.

The database remains the source of truth. Socket.IO is an acceleration and synchronization channel; clients must fetch missing messages after reconnecting.

## Data Model

Add three tables using the repository's existing startup migration pattern or a dedicated migration script:

### conversations

- `id` — opaque conversation identifier.
- `request_id` — required foreign-key-like reference to `delivery_requests.request_id`.
- `rider_id` — required assigned rider identifier.
- `status` — `open` or `closed`.
- `last_message_at` — indexed timestamp used for inbox sorting.
- `created_at`, `updated_at`.
- Unique constraint on `(request_id, rider_id)`.

### conversation_participants

- `conversation_id`.
- `user_id`.
- `last_read_at`.
- `created_at`.
- Unique constraint on `(conversation_id, user_id)`.

### messages

- `id` — server-generated message identifier.
- `conversation_id`.
- `sender_id`.
- `client_message_id` — client-generated UUID for retry idempotency.
- `body` — bounded text field; whitespace-only messages rejected.
- `created_at`.
- `read_at` — nullable read timestamp.
- Unique constraint on `(sender_id, client_message_id)`.
- Indexes on `(conversation_id, created_at, id)` and `(sender_id, created_at)`.

The existing notifications record will reference the conversation/message through its existing request link plus a message-specific notification type. If the current schema can safely accept nullable additions, add `conversation_id` and `message_id`; otherwise the notification payload will carry those identifiers without changing unrelated notification consumers.

## Authorization Rules

Every REST and Socket.IO operation must derive identity from the authenticated session, never from client-provided participant fields.

- Admins can view and send messages for conversations belonging to requests visible in the dispatch console.
- A rider can view and send only within conversations where they are the currently assigned rider.
- Personnel users are not conversation participants in version 1 unless they are explicitly granted admin-side access in a later phase.
- Creating or reopening a conversation requires the request to have an assigned rider.
- Reassignment closes the old rider conversation and creates or opens a new conversation for the new rider; old messages remain auditable but are not visible to the new rider unless explicitly authorized.
- Closed conversations are read-only.

## API Contract

Add authenticated routes under `/api/conversations`:

- `GET /api/conversations` — inbox summary, cursor pagination, unread count, request summary, last message.
- `POST /api/conversations` — create/open the conversation for an assigned request; server validates assignment and participant roles.
- `GET /api/conversations/:id/messages?before=<cursor>&limit=<n>` — newest page or older messages.
- `POST /api/conversations/:id/messages` — send a message with `client_message_id` and body; returns the canonical message.
- `PUT /api/conversations/:id/read` — update participant `last_read_at` and emit a read event.
- `GET /api/requests/:id/conversation` — resolve the request-linked conversation for the dispatch details view.

Responses must return stable IDs, server timestamps, request summary, sender display data, and unread metadata. Message creation must be idempotent: a retry with the same sender and client ID returns the original message rather than inserting a duplicate.

## Message and Notification Flow

1. Client submits a message with a client-generated ID.
2. API authenticates the user and verifies conversation membership and request assignment.
3. In one database transaction, insert the message, update conversation timestamps, and create an unread notification for the other participant.
4. Commit before emitting real-time events.
5. Emit `conversation-message` to the conversation room and recipient user room.
6. Existing in-app notification listeners update badges/inbox state.
7. The push worker sends an Expo notification when a valid rider token exists and the recipient is not actively reading the conversation.
8. On reconnect, the client refetches the inbox and messages using cursors.

Socket rooms must be authorized server-side. Clients may request a room join, but the server checks that the authenticated user is a participant before joining.

## UI/UX

### Admin web

- Add an Inbox entry to the admin navigation.
- Inbox rows show rider, request ID, route/status summary, last message, timestamp, and unread badge.
- Conversation view displays request context above the message list.
- Message composer has a clear send state, disabled empty submit, and retry feedback.
- Selecting a request in Dispatch Console opens the same conversation without losing request context.

### Rider mobile app

- Add Inbox to the existing rider navigation.
- Show conversations ordered by latest message with unread badges.
- Conversation screen uses a safe-area-aware message list and keyboard-safe composer.
- Sending works optimistically but shows pending/failed state and retries using the client message ID.
- Push notification tap deep-links to the conversation/request.

All interactive controls use mobile touch targets, support keyboard/accessibility labels where applicable, and avoid horizontal overflow.

## Reliability and Security

- Validate message length and normalize whitespace server-side.
- Apply per-user message rate limiting in addition to the existing global API limiter.
- Escape/render message bodies as plain text; no HTML or executable content.
- Do not log message bodies or access tokens.
- Use transactions for message plus notification persistence.
- Use the existing push worker/outbox behavior so push failure does not roll back a saved message.
- Return cursor pagination limits to protect the API from large histories.
- Add audit events for message send, conversation open, and read state changes without storing message contents in general audit logs.

## Testing Strategy

- API authorization tests for admin, assigned rider, unassigned rider, unrelated rider, and closed conversations.
- Idempotency test for repeated client message IDs.
- Pagination and unread/read state tests.
- Socket event tests for authorized room joins and message delivery.
- Notification creation and push-worker handoff tests.
- Admin inbox and rider mobile UI tests for opening, sending, retrying, and marking read.
- Regression tests for request reassignment and conversation visibility.

## Rollout

1. Add tables/indexes and server contracts behind a feature flag or capability check.
2. Ship API and authorization tests.
3. Ship admin inbox and request-context entry point.
4. Ship rider mobile inbox and push deep links.
5. Enable for internal admin/rider accounts and monitor message creation errors, socket delivery, unread counts, and push failures.

## Open Decisions

- Conversation retention period and archival policy.
- Whether supervisors should see conversations for riders outside their current dispatch scope.
- Whether attachments should be a later separate feature with object storage and malware scanning.
