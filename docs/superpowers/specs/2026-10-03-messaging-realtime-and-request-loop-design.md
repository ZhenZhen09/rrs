# Messaging Realtime Delivery and Request Loop Design

## Intended outcome

Admin and rider messages appear in the other participant's open conversation without a manual refresh. Opening a mobile conversation must not start an endless sequence of API requests. Read receipts and unread badges remain accurate, and reconnecting recovers messages missed while disconnected.

This is a repair to the existing admin web and rider mobile messaging feature. The request is to produce a plan; implementation and deployment are subsequent work.

## Evidence and limits

The current mobile `refreshMessages()` always calls `markConversationRead()`. The server read route emits `conversation-updated` to the reader's user room. The mobile update listener calls `refreshMessages()` again. A controlled in-memory reproduction using the current hook callbacks and route handler produced 11 message GETs and 10 read PUTs from one refresh, with zero message sends; execution was stopped at the eleventh GET.

The message route currently emits `conversation-message` to `conversation_<id>` and the sender's user room. The existing web and mobile clients join their user rooms, but neither requests `join-conversation`. A controlled route reproduction confirmed that a rider reply targets the conversation room and the rider's room, excluding the admin's user room.

`Too many requests. Please try again later.` is the global limiter's error: 1,000 API requests per IP in 15 minutes. The separate message POST limiter returns `Too many messages. Please try again later.` after 30 attempts per authenticated user in 60 seconds. Existing mobile send-cooldown work does not remove the read/update loop.

These findings are based on the current working tree and controlled reproductions. A live admin/mobile verification is still required. The rider API URL is currently `http://192.168.1.19:3001`; the admin development proxy points to `http://127.0.0.1:3001`. Verify that both reach the same backend instance.

## Selected approach

Use the authenticated user rooms that both clients already join. Resolve authorized conversation participants on the server and emit once to the union of their user rooms. This delivers messages whether a recipient is viewing the conversation or only the inbox and avoids adding a second client room lifecycle.

An alternative is to join and leave authorized conversation rooms on both clients. That adds reconnect, selection, and stale-room cleanup responsibilities and still needs recipient user-room delivery for inbox updates. It is unnecessary for this repair. Periodic polling is also unnecessary because the existing Socket.IO connection supports the required delivery.

## Global constraints

- Keep the REST routes, message payloads, clientMessageId idempotency, and existing participant permissions unchanged.
- Keep the global limit at 1,000 API requests per IP per 15 minutes and the message limit at 30 POST attempts per authenticated user per 60 seconds.
- Emit message content only to authenticated conversation participants who are admins or the currently assigned rider; never broadcast it to admin-room or every connected socket.
- Persist messages and read state before emitting socket events; a push or realtime delivery failure must not undo a saved message.
- Do not introduce periodic messaging polling, automatic HTTP 429 retries, new dependencies, database migrations, or unrelated UI, authentication, or location changes.
- Preserve unrelated working-tree changes and do not commit, publish, or deploy as part of planning.

## Server event contract

The server adds an internal `listConversationDeliveryTargets(conversationId, actorId)` helper. It first checks the authenticated actor's conversation access, then returns deduplicated `{ userId, requestId }` entries for authorized participants. The SQL must join current user roles and the request's current rider assignment; historical membership alone is insufficient.

After a successful message transaction, broadcast `conversation-message` with the existing `{ conversationId, message }` payload once through `io.to(userIds).emit(...)`. Keep the existing message-related `conversation-updated` payload for compatibility, targeting the same user-room union. Push targets use the same authorized list, excluding the sender.

After a successful read transaction, emit only `conversation-read` with the existing `{ conversationId, userId, readAt }` payload to that union. Stop producing `conversation-updated` for reads. A delivery-target lookup or push failure after persistence is logged without message bodies or tokens and does not turn a saved message into a failed send response. Reconnect synchronization provides recovery when realtime delivery is unavailable.

Existing `join-conversation` authorization can remain for compatibility, but the repaired clients do not rely on conversation-room membership. A previously joined socket must not receive sensitive events merely because it remains in an old conversation room.

## Mobile behavior

- `conversation-message` upserts the canonical message by server ID and clientMessageId. An incoming message for the focused conversation appears immediately. An own-message echo reconciles the optimistic item without inserting another bubble or sending a read PUT.
- Only a new message from another participant in the focused conversation triggers a read acknowledgement. Duplicate delivery, unrelated conversations, inactive screens, and own-message echoes do not trigger additional read PUTs.
- `conversation-read` updates local unread state for the matching reader and requests a bounded inbox/badge reconciliation when necessary. It never reloads message history or sends a read PUT.
- For compatibility with an older server, a `conversation-updated` payload containing `readAt` is treated as a read receipt. Other updates reconcile inbox metadata and never trigger a full selected-thread reload.
- Full thread GETs happen on focus, explicit refresh, or recovery of the focused thread after reconnect. Concurrent refresh requests share one in-flight operation. A response for a previously selected conversation cannot replace the current conversation's state.
- Inbox and badge event refreshes retain a minimum 1,000 ms interval, with one bounded trailing refresh when an event arrives during an in-flight request or that interval. A final event must not be silently lost. Failure clears queued automatic work; HTTP 429 never starts a retry loop.
- A fetched snapshot merges with canonical messages received while it was in flight and with pending/failed optimistic messages. It does not erase an in-progress send. Respect the existing newest-first mobile ordering and the backend's database timestamp representation.
- Clean up event listeners and pending refresh timers when the hook is disposed. Reconnect recovery runs only for a focused conversation and once per connection transition, not on every render.

## Admin behavior

The admin listens to message, read, metadata, and reconnect events. Read receipts clear the reader's matching unread count without invoking `fetchMessages()` or another read PUT. Legacy read-shaped update events follow the same path.

A unique incoming rider message updates the selected thread immediately, acknowledges it once when that conversation is actually visible, and updates the inbox summary. Own-message echoes and duplicate IDs do not increase unread counts or cause repeated read acknowledgements. On narrow screens, a selected ID with the conversation sheet closed is not an actively viewed thread.

Known message-related metadata updates do not cause a second history request. Unknown conversation IDs request one coalesced inbox fetch. Reconnect fetches the inbox and, when visible, the selected thread. In-flight snapshots merge with socket messages and do not replace a newly selected conversation.

## Scope boundaries

There is no new global message read-marker design. Existing per-participant `last_read_at` remains authoritative for unread counts; a receipt from one admin must not clear another admin's unread count. No changes are required to attachment support, retention, notification presentation, or general location refresh behavior.

## Acceptance criteria

1. One rider reply and one admin message each reach the other connected participant without manual refresh or conversation-room joins.
2. Opening a conversation causes a bounded initial fetch/read acknowledgement, then an idle 30-second observation contains zero additional thread GETs, read PUTs, or message POSTs after event work settles.
3. Read receipts from the current user, another participant, or an unrelated conversation cause zero thread GETs and zero read PUTs.
4. Duplicate and own-message events do not duplicate bubbles, increment unread counts incorrectly, or repeat read acknowledgements.
5. Reconnect recovers a message missed offline and retains an optimistic message whose HTTP response has not arrived yet.
6. Former riders, unrelated users, and personnel sockets do not receive message content through stale membership or broad rooms.
7. Genuine HTTP 429 responses remain visible without automatic retry storms. A pre-existing limiter window may require waiting for its Retry-After duration after the repair.
8. Every affected package has fresh lint, typecheck, test, and build evidence in that order. Missing tooling or unrelated failures are reported explicitly and prevent a completion claim.

## Validation and rollout

Add regression tests that replay captured socket callbacks rather than mocking subscriptions away. Add isolated real-Socket.IO delivery tests with mocked persistence, then a dedicated development-fixture browser/socket check and a physical rider-app check. Measure request counts after settling, not only API message persistence.

Execute the repository quality gate for mobile, web, and server; refresh graphify after code changes. Use existing tools and report the root/server lint-script gap explicitly. Deploy only after the implementation and checks are complete and deployment is separately authorized. Do not reset shared limiter state to hide a regression.
