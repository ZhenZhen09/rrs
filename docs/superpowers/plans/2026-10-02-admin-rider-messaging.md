# Admin–Rider Request Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, request-linked text messaging between the admin web console and assigned riders in the mobile app, with inboxes, unread/read state, Socket.IO delivery, retry-safe sends, and push notifications.

**Architecture:** Add server-authoritative conversation, participant, and message persistence behind authenticated REST routes. Use the existing Socket.IO user/request-room infrastructure for live delivery, while treating MySQL as the source of truth and re-fetching after reconnect. Add focused admin and rider inbox/chat surfaces that share the same API contract and existing notification/push infrastructure.

**Tech Stack:** Express, TypeScript, MySQL, Socket.IO, React/Vite, React Native/Expo, Radix UI, Tailwind, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-admin-rider-messaging-design.md`

## Global Constraints

- Version 1 supports one conversation per delivery request between an admin-side user and the currently assigned rider.
- Version 1 is text-only; no group conversations, attachments, reactions, editing, or deletion.
- The database is the source of truth; Socket.IO only accelerates synchronization.
- Every REST and Socket.IO operation derives identity from the authenticated session.
- Reassignment closes the old rider conversation and prevents the new rider from seeing old messages.
- Message retries are idempotent using `(sender_id, client_message_id)`.
- Message histories use cursor pagination with bounded limits.
- Do not commit or push changes.

## Review Focus

- Unassigned requests cannot create or send conversations: cover in server authorization tests in Task 2.
- A previously assigned rider cannot access messages after reassignment: cover in Task 2.
- Repeated mobile retries do not duplicate a message: cover in Task 3.
- Socket room joins cannot bypass REST membership checks: cover in Task 4.
- Offline mobile send/reconnect does not lose or duplicate messages: cover in Task 6.

### Task 1: Messaging persistence and typed domain contracts

**Files:**
- Create: `server/services/messaging.ts`
- Create: `server/types/messaging.ts`
- Modify: `server/index.ts:startup initialization`
- Create: `server/services/__tests__/messaging.test.ts`
- Create: `src/app/types/messaging.ts`
- Create: `mobile-app/types/messaging.ts`

**Interfaces:**
- Produces `ConversationSummary`, `ConversationMessage`, `MessagePage`, and `MessagingParticipant` types shared by later server/client tasks.
- Produces `ensureMessagingTables(): Promise<void>`.
- Produces `getOrCreateRequestConversation(requestId: string, actorId: string)`, `listConversations(actorId, cursor, limit)`, `listMessages(conversationId, actorId, before, limit)`, `createMessage(input)`, and `markConversationRead(conversationId, actorId)` service functions.
- Consumes existing `pool`, request rows, authenticated user IDs, and assigned rider IDs.

- [ ] **Step 1:** Write failing persistence tests for table initialization, unique `request_id+rider_id`, participant membership, message ordering, cursor limits, and duplicate `client_message_id` handling.
- [ ] **Step 2:** Run `npx vitest run server/services/__tests__/messaging.test.ts`; confirm it fails because the service/tables do not exist.
- [ ] **Step 3:** Add the three tables with bounded text, timestamps, unique constraints, and indexes described in the specification.
- [ ] **Step 4:** Implement typed row mappers and service functions using parameterized SQL and transactions for message + notification persistence.
- [ ] **Step 5:** Run the focused test again and confirm persistence behavior passes.
- [ ] **Step 6:** Register `ensureMessagingTables()` during server startup beside the existing table initializers.

### Task 2: REST API and authorization

**Files:**
- Create: `server/routes/conversations.ts`
- Create: `server/schemas/conversationSchema.ts`
- Modify: `server/index.ts:route registration`
- Create: `server/routes/__tests__/conversations.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/conversations`
  - `POST /api/conversations`
  - `GET /api/conversations/:id/messages`
  - `POST /api/conversations/:id/messages`
  - `PUT /api/conversations/:id/read`
  - `GET /api/requests/:id/conversation`
- Consumes Task 1 services and existing `authenticate`, `authorize`, request lookup, and push/notification helpers.

- [ ] **Step 1:** Write failing route tests for admin access, assigned-rider access, unrelated-rider rejection, unassigned-request rejection, reassignment visibility, invalid body rejection, cursor pagination, and read updates.
- [ ] **Step 2:** Run the focused route test and confirm it fails because the routes are not registered.
- [ ] **Step 3:** Implement Zod schemas for request IDs, bounded message bodies, client UUIDs, cursors, and limits.
- [ ] **Step 4:** Implement the routes so actor identity comes from `req.user`, assignment comes from the database, and client participant fields are ignored/rejected.
- [ ] **Step 5:** Register routes under `/api` and run the focused route tests until they pass.
- [ ] **Step 6:** Add a per-user message rate limit to the send route without weakening the existing global limiter.

### Task 3: Transactional notifications and push handoff

**Files:**
- Modify: `server/services/messaging.ts`
- Modify: `server/routes/notifications.ts` or extract a shared notification helper
- Modify: `server/services/webPush.ts` if a reusable push enqueue helper is required
- Create: `server/services/__tests__/messaging-notifications.test.ts`

**Interfaces:**
- Produces a message notification record with `type: 'conversation_message'`, `request_id`, and conversation/message identifiers.
- Consumes existing notification row shape, Socket.IO app instance, and Expo push token service.

- [ ] **Step 1:** Write failing tests proving a successful message creates exactly one recipient notification and push handoff, while push failure does not roll back the message.
- [ ] **Step 2:** Run the focused notification test and confirm it fails.
- [ ] **Step 3:** Add notification creation to the same database transaction as the message and conversation timestamp update.
- [ ] **Step 4:** Emit the existing user notification event after commit and hand off Expo push delivery without logging message bodies.
- [ ] **Step 5:** Run the focused notification tests and confirm they pass, including duplicate-send behavior.

### Task 4: Socket.IO authorization and real-time delivery

**Files:**
- Modify: `server/index.ts:Socket.IO connection handlers`
- Create: `server/services/__tests__/messaging-socket.test.ts`
- Modify: `src/app/context/RealTimeContext.tsx` only if shared web socket typing is needed
- Create: `mobile-app/services/messagingSocket.ts`

**Interfaces:**
- Produces events: `conversation-message`, `conversation-read`, and `conversation-updated`.
- Produces an authorized `join-conversation` event flow.
- Consumes Task 2 membership checks and authenticated Socket.IO user identity.

- [ ] **Step 1:** Write failing socket tests for authorized participant joins, rejected non-participant joins, message delivery to both user and conversation rooms, and read events.
- [ ] **Step 2:** Run the focused socket test and confirm it fails.
- [ ] **Step 3:** Add server-side conversation room membership checks before joining `conversation_<id>`.
- [ ] **Step 4:** Emit canonical message/read events after successful REST operations and keep admin-room broadcasts limited to authorized operational metadata.
- [ ] **Step 5:** Implement client socket adapters that subscribe/unsubscribe cleanly and refetch after reconnect.
- [ ] **Step 6:** Run focused socket tests and confirm they pass.

### Task 5: Admin web inbox and conversation UI

**Files:**
- Create: `src/app/pages/Admin/MessagingInbox.tsx`
- Create: `src/app/components/Admin/Messaging/ConversationList.tsx`
- Create: `src/app/components/Admin/Messaging/ConversationView.tsx`
- Create: `src/app/components/Admin/Messaging/MessageComposer.tsx`
- Create: `src/app/hooks/useMessaging.ts`
- Modify: `src/app/pages/Admin/AdminLayout.tsx:navigation`
- Modify: `src/app/routes.tsx` if the app uses a route entry for admin views
- Modify: `src/app/pages/Admin/DispatchConsole.tsx:request details entry point`
- Create: `src/app/pages/Admin/__tests__/MessagingInbox.test.tsx`

**Interfaces:**
- Produces an admin inbox route/view and a request-context “Message rider” action.
- Consumes Task 2 REST endpoints and Task 4 Socket.IO events.
- Uses existing Sheet/Dialog, notification bell, request status, and admin layout patterns.

- [ ] **Step 1:** Write failing UI tests for inbox loading, unread badge, request context, empty composer rejection, optimistic send, retry state, and marking read.
- [ ] **Step 2:** Run the focused UI test and document any existing missing `@testing-library/react` setup failure without weakening repository scripts.
- [ ] **Step 3:** Implement `useMessaging` with cursor state, abort-safe loading, client message IDs, optimistic messages, retry, and reconnect refresh.
- [ ] **Step 4:** Implement the conversation list, view, and composer with accessible labels, plain-text rendering, bounded input, mobile-safe layout, and keyboard focus.
- [ ] **Step 5:** Add the Admin navigation entry and request details action while preserving existing dispatch behavior.
- [ ] **Step 6:** Run focused UI tests and build; manually verify the admin flow at desktop and narrow viewport widths.

### Task 6: Rider mobile inbox and conversation UI

**Files:**
- Create: `mobile-app/app/(tabs)/inbox.tsx`
- Create: `mobile-app/app/conversation/[id].tsx`
- Create: `mobile-app/services/messagingApi.ts`
- Create: `mobile-app/hooks/useMessaging.ts`
- Modify: `mobile-app/app/(tabs)/_layout.tsx:navigation`
- Modify: `mobile-app/app/_layout.tsx:deep-link handling`
- Create: `mobile-app/components/messaging/ConversationRow.tsx`
- Create: `mobile-app/components/messaging/MessageBubble.tsx`
- Create: `mobile-app/components/messaging/MessageComposer.tsx`
- Create: `mobile-app/utils/__tests__/messaging-retry.test.ts`

**Interfaces:**
- Produces rider inbox and conversation screens, deep-link target, and retry-safe message queue behavior.
- Consumes Task 2 REST endpoints, Task 4 socket adapter, existing auth/API client, Expo notifications, and safe-area/keyboard utilities.

- [ ] **Step 1:** Write failing retry tests for client ID stability, retry reuse, duplicate response reconciliation, and reconnect refresh.
- [ ] **Step 2:** Run the focused mobile test and confirm it fails before the retry queue exists.
- [ ] **Step 3:** Implement the mobile messaging API and retry queue using existing authenticated API utilities; do not create a second auth/token mechanism.
- [ ] **Step 4:** Implement inbox and conversation screens with safe-area padding, keyboard avoidance, paginated message list, pending/failed states, and touch-sized controls.
- [ ] **Step 5:** Register the inbox tab and conversation route without disrupting existing rider tabs.
- [ ] **Step 6:** Add push notification deep-link handling for `conversationId` and `requestId`.
- [ ] **Step 7:** Run focused mobile tests and the mobile TypeScript check; manually verify phone-sized and tablet-sized layouts.

### Task 7: Request lifecycle integration

**Files:**
- Modify: `server/routes/requests.ts:assignment/reassignment/terminal transitions`
- Modify: `src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx`
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Modify: `mobile-app/hooks/data/useJobDetails.ts` or rider job details screen
- Create: `server/routes/__tests__/conversation-lifecycle.test.ts`

**Interfaces:**
- Consumes Task 1 conversation service and Task 2 request conversation endpoint.
- Produces close/reopen behavior on assignment changes and request terminal states.

- [ ] **Step 1:** Write failing lifecycle tests for assignment creation, reassignment closure, terminal read-only state, and no-conversation behavior for unassigned requests.
- [ ] **Step 2:** Run lifecycle tests and confirm failure.
- [ ] **Step 3:** Open conversations only after assignment and close the previous rider’s conversation during reassignment.
- [ ] **Step 4:** Add admin “Message rider” and rider job “Open conversation” entry points.
- [ ] **Step 5:** Run lifecycle tests and request regression tests.

### Task 8: End-to-end verification and quality gate

**Files:**
- Create: `tests/e2e/messaging-workflow.spec.ts`
- Create: `tests/e2e/messaging-mobile.spec.ts`
- Modify: `tests/utils/session-manager.ts` only if shared authenticated contexts need a safe helper
- No commits or pushes.

- [ ] **Step 1:** Add an E2E workflow covering admin sends to assigned rider, rider receives, rider replies, admin sees reply, both unread counts update, and both messages become read.
- [ ] **Step 2:** Add offline/reconnect coverage using controlled socket disconnect and retry assertions.
- [ ] **Step 3:** Run targeted E2E tests with the existing Playwright runner and document environment prerequisites.
- [ ] **Step 4:** Run the repository quality gate in order: lint, typecheck, test, build. If a command is unavailable or has pre-existing failures, record the exact result and do not weaken scripts.
- [ ] **Step 5:** Run `graphify update .` after all code changes.
- [ ] **Step 6:** Inspect `git diff` and `git status`; leave all changes uncommitted and unpushed as requested.

