# Messaging Realtime Delivery and Request Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin/rider messages appear immediately in both directions and eliminate the mobile read/update request loop that exhausts the global API limiter.

**Architecture:** Separate new messages, read receipts, and inbox metadata. Route socket events to the union of server-authorized participant user rooms, which the existing clients already join. Make mobile and admin event handling deduplicate messages, acknowledge only visible incoming messages, and reserve full thread fetches for focus, explicit refresh, and reconnect recovery.

**Tech Stack:** React 18 admin web, React Native/Expo rider app, TypeScript, Axios/fetch, Express, Socket.IO 4, MySQL, Jest, Vitest, Supertest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-03-messaging-realtime-and-request-loop-design.md`

## Execution status (2026-10-04)

Implementation from the prior session is present. Task 4's three mounted-browser acceptance cases have now been added to `tests/messaging-e2e.spec.ts`; Playwright discovers all four tests, including the retained API lifecycle case. These live cases have not run. The user will perform live browser/device acceptance manually.

The quality gate passed lint and mobile/server typechecks, then stopped on 221 existing root web TypeScript errors outside the messaging files. Tests and builds were not run after that failure. The graph has been refreshed. Tasks 4 and 5 remain incomplete; discovery and prior-session results are not passing acceptance evidence. See [verification report and manual checklist](../reports/2026-10-04-messaging-verification.md).

## Global Constraints

- Keep the REST routes, message payloads, clientMessageId idempotency, and existing participant permissions unchanged.
- Keep the global limit at 1,000 API requests per IP per 15 minutes and the message limit at 30 POST attempts per authenticated user per 60 seconds.
- Emit message content only to authenticated conversation participants who are admins or the currently assigned rider; never broadcast it to admin-room or every connected socket.
- Persist messages and read state before emitting socket events; a push or realtime delivery failure must not undo a saved message.
- Do not introduce periodic messaging polling, automatic HTTP 429 retries, new dependencies, database migrations, or unrelated UI, authentication, or location changes.
- Preserve unrelated working-tree changes and do not commit, publish, or deploy as part of planning.

## Review Focus

- Own-message echoes and duplicate deliveries must reconcile one bubble and cause no repeated read PUTs: Task 1 and Task 3 tests.
- Receipts for another conversation or another admin must not reload the selected thread or clear the wrong unread count: Task 1 and Task 3 tests.
- Former riders, changed user roles, and sockets lingering in old rooms must not receive content: Task 2 service/route tests and Task 4 socket tests.
- Reconnect and an HTTP response racing a new socket message must preserve both canonical and pending messages: Task 1 and Task 3 tests, Task 4 live check.
- Event bursts, failed requests, and unmount during queued refresh work must stay bounded and stop after HTTP 429: Task 1 scheduler/hook tests and Task 4 request-count checks.

## Current evidence and execution preflight

The previous controlled reproduction yielded 11 message GETs and 10 read PUTs from one mobile refresh, with zero sends. The current server message route targets the conversation room and sender room only. The clients do not request `join-conversation`.

The existing October 3 rate-limit-resilience plan concerns duplicate POSTs and send cooldowns. This plan repairs the separate GET/read-event feedback loop and missing recipient delivery; do not replace the earlier plan or undo its changes.

- [x] Read the spec, `AGENTS.md`, and `.agents/skills/quality-gate/SKILL.md`.
- [x] Inspect `git status --short` and preserve the existing uncommitted messaging files and unrelated changes. If worktree isolation is required by the execution workflow, transfer the exact relevant working-tree state into it; a clean checkout alone does not contain this feature.
- [ ] Verify both clients reach the same backend instance and record the source revision/working tree used for the live check.
- [x] Check installed dependencies and validation commands without installing anything. Root/server have no lint script or root ESLint configuration; Task 5 documents the existing-tool equivalent and the conditions under which that stage remains missing.

## File map

| File | Responsibility |
| --- | --- |
| `mobile-app/hooks/useMessaging.ts` | Focused thread state, socket handling, read acknowledgements, reconnect and in-flight snapshot merging |
| `mobile-app/hooks/useMessagingUnread.ts` | Bounded unread-badge synchronization |
| `mobile-app/utils/messagingRefresh.ts` | Existing refresh-interval policy plus a disposable event-refresh queue |
| `mobile-app/utils/messagingRetry.ts` | Existing client IDs and canonical/optimistic message reconciliation |
| `server/services/messaging.ts` | Authoritative participant lookup for delivery alongside existing persistence/authorization |
| `server/types/messaging.ts` | Internal delivery-target type, without changing REST message types |
| `server/routes/conversations.ts` | Participant user-room fanout and distinct read events after persistence |
| `src/app/utils/messaging.ts` | Admin summary/receipt state helpers and testable event subscription |
| `src/app/pages/Admin/AdminMessaging.tsx` | Visible-thread acknowledgement, inbox updates, deduplication, reconnect recovery |
| Existing and new test files listed below | Replayed client callbacks, REST/socket delivery, and request-count regression checks |

---

### Task 1: Stop the mobile feedback loop and preserve reconnect state

**Files:**
- Modify: `mobile-app/hooks/useMessaging.ts`
- Modify: `mobile-app/hooks/useMessagingUnread.ts`
- Modify: `mobile-app/utils/messagingRefresh.ts`
- Modify: `mobile-app/utils/messagingRetry.ts` only for canonical/snapshot merging
- Test: `mobile-app/hooks/__tests__/useMessaging.test.ts`
- Create test: `mobile-app/hooks/__tests__/useMessagingUnread.test.ts`
- Test: `mobile-app/utils/__tests__/messagingRefresh.test.ts`
- Test: `mobile-app/utils/__tests__/messaging-retry.test.ts`

**Interfaces:**
- Consume the existing `useLocation().subscribeToSocketEvent(event, listener)` and `isSocketConnected` contract. Consume `useAuth().user.id` to distinguish own-message echoes.
- Preserve the hook's public `refreshInbox(options?: { force?: boolean })`, `refreshMessages()`, `send()`, `retry()`, error, loading, and cooldown fields.
- Add to `messagingRefresh.ts`: `createMessagingRefreshQueue(refresh: () => Promise<void>, onError: (error: unknown) => void, minimumIntervalMs?: number): { request: (options?: { force?: boolean }) => Promise<void>; dispose: () => void }`.
- Queue defaults: `minimumIntervalMs = 1000`, one active request, one pending demand flag, one trailing timer. Force skips the interval but never duplicates an in-flight request. Rejection clears queued automatic work and calls `onError`; it never schedules a retry or leaves an unhandled rejected promise for callers using `void request()`. `dispose()` clears the timer and pending flag. The consuming hooks must also guard their own state updates after unmount, since the queued operation can already be running when disposal occurs.
- Add to `messagingRetry.ts`: `mergeFetchedMessages(current: (ConversationMessage & { localStatus?: LocalMessageStatus })[], fetched: ConversationMessage[]): (ConversationMessage & { localStatus?: LocalMessageStatus })[]`. Reconcile by both IDs, keep pending/failed items, retain messages received during the fetch, and preserve newest-first mobile ordering. Do not treat SQL timestamps from the `+08:00` database connection as UTC by blindly appending `Z`.

- [ ] **Step 1: Add a real event-callback test harness.** Replace the current no-op subscription mock with a listener map. Mock `useAuth` as `rider-1`; keep automatic focus off in these callback tests so each request has an explicit trigger.

```ts
const listeners = new Map<string, (...args: any[]) => void>();
const subscribe = jest.fn((event: string, listener: (...args: any[]) => void) => {
  listeners.set(event, listener);
  return () => { if (listeners.get(event) === listener) listeners.delete(event); };
});

const riderReceipt = {
  conversationId: 'conversation-1', userId: 'rider-1',
  readAt: '2026-10-03 10:00:00.000000',
};

it('does not refetch or acknowledge a legacy read update', async () => {
  const { result } = renderHook(() => useMessaging('conversation-1'));
  await act(async () => { await result.current.refreshMessages(); });
  mockedGetMessages.mockClear();
  mockedMarkConversationRead.mockClear();

  await act(async () => {
    listeners.get('conversation-updated')?.(riderReceipt);
  });

  expect(mockedGetMessages).not.toHaveBeenCalled();
  expect(mockedMarkConversationRead).not.toHaveBeenCalled();
});

it('does not refetch or acknowledge a conversation-read event', async () => {
  renderHook(() => useMessaging('conversation-1'));
  await act(async () => { listeners.get('conversation-read')?.(riderReceipt); });
  expect(mockedGetMessages).not.toHaveBeenCalled();
  expect(mockedMarkConversationRead).not.toHaveBeenCalled();
});
```

The first test must fail on the current code because the update callback calls `refreshMessages()`. Also assert that a read listener is registered; an absent listener must not make the second test pass accidentally.

- [ ] **Step 2: Run the regression before implementation.**

```powershell
npm --prefix mobile-app test -- --runInBand hooks/__tests__/useMessaging.test.ts
```

Expected: the legacy-read-update regression fails for an extra GET/read PUT; pre-existing send-cooldown cases still pass.

- [ ] **Step 3: Separate message and receipt handlers.** Use focused state from `useFocusEffect`, track processed message identities in refs, and remove the full-thread reload from `onUpdate`. Acknowledge after deciding that an event is unique, incoming, and visible; do not perform API side effects inside a React state updater.

```ts
const onRead = (payload: {
  conversationId: string; userId: string; readAt: string;
}) => {
  if (payload.userId === user?.id) {
    setConversations(current => current.map(item =>
      item.id === payload.conversationId ? { ...item, unreadCount: 0 } : item));
  }
  void inboxRefreshQueue.request();
};

const onUpdate = (payload: {
  conversationId: string; userId?: string; readAt?: string;
}) => {
  if (payload.userId && payload.readAt) {
    onRead({ ...payload, userId: payload.userId, readAt: payload.readAt });
    return;
  }
  void inboxRefreshQueue.request();
};

const removeRead = subscribeToSocketEvent('conversation-read', onRead);
// Include removeRead() alongside the existing message/update cleanup.
```

`inboxRefreshQueue` is the Task 1 utility instance wrapping `getConversations()`, with its rejection callback setting the existing inbox error. Use the same queue utility independently for the unread-badge consumer. Multiple mounted consumers may each reconcile once; none may create a recurring thread/read loop.

- [ ] **Step 4: Implement the queue and protected full-thread fetch.** Follow the interface above: store the active promise, last-start time, pending-demand flag, trailing timeout, and disposed flag in the queue closure. On success, schedule at most one demanded trailing run after the remaining interval. On rejection, discard pending work and call `onError`. Focus/reconnect explicitly requests a refresh; receipts never do. A thread fetch captures its conversation ID and merges into state only if that ID is still selected. Use `mergeFetchedMessages()` when a socket event or send can overlap the snapshot. A same-thread concurrent `refreshMessages()` call returns the active promise.

- [ ] **Step 5: Add the identity, focus, queue, and race assertions.**

```ts
// In the listener-map harness, use a full ConversationMessage fixture.
await act(async () => {
  listeners.get('conversation-message')?.({ conversationId: message.conversationId, message });
  listeners.get('conversation-message')?.({ conversationId: message.conversationId, message });
});
expect(result.current.messages.filter(item => item.id === message.id)).toHaveLength(1);
expect(mockedMarkConversationRead).toHaveBeenCalledTimes(1);

const ownEcho = { ...message, id: 'own-server', sender: { id: 'rider-1', name: 'Rider', role: 'rider' as const } };
mockedMarkConversationRead.mockClear();
await act(async () => {
  listeners.get('conversation-message')?.({ conversationId: ownEcho.conversationId, message: ownEcho });
});
expect(mockedMarkConversationRead).not.toHaveBeenCalled();
```

Use a separate suite that captures/runs the focus callback, returning its cleanup when focus ends. The unique incoming assertion runs with that callback active. Parameterize receipts across own user, another admin, and another conversation; expect zero thread GETs/read PUTs in all cases. End focus and replay a unique message; expect no read PUT. Render the hook with an inbox-only ID and replay receipts; expect no message-history request.

Use Jest fake timers for the refresh queue: 20 demands while the first request is pending yield one active call and at most one trailing call; the final response contains the final unread count. Reject a deferred request with HTTP 429 and advance 30 seconds; call count must not increase automatically. Dispose before the trailing timer fires; there must be no new call. Recover an explicitly requested refresh after failure.

```ts
it('coalesces a burst into one active and one trailing refresh', async () => {
  jest.useFakeTimers();
  let releaseFirst!: () => void;
  const refresh = jest.fn()
    .mockImplementationOnce(() => new Promise<void>(resolve => { releaseFirst = resolve; }))
    .mockResolvedValue(undefined);
  const onError = jest.fn();
  const queue = createMessagingRefreshQueue(refresh, onError);
  const first = queue.request();
  for (let index = 0; index < 20; index += 1) void queue.request();
  expect(refresh).toHaveBeenCalledTimes(1);
  releaseFirst();
  await first;
  await jest.advanceTimersByTimeAsync(1000);
  expect(refresh).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(30_000);
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(onError).not.toHaveBeenCalled();
  queue.dispose();
});

it('does not automatically retry a rate-limited refresh', async () => {
  jest.useFakeTimers();
  const error = { response: { status: 429, headers: { 'retry-after': '900' } } };
  const refresh = jest.fn().mockRejectedValue(error);
  const onError = jest.fn();
  const queue = createMessagingRefreshQueue(refresh, onError);
  await queue.request();
  await jest.advanceTimersByTimeAsync(30_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledWith(error);
  queue.dispose();
});
```

Import `createMessagingRefreshQueue` from the existing refresh utility and restore real timers in suite cleanup. These tests must execute the queue rather than reproduce its internal conditions as a second implementation.

For a fetch race, hold `getMessages()` unresolved, replay a new socket message and create a pending local send, then resolve the older snapshot. Assert the new canonical message and pending local item both remain. Rerender with another conversation before resolving the first fetch; assert no first-thread message is inserted into the second. Toggle connectivity while focused; assert one catch-up operation and no accumulating listeners.

- [ ] **Step 6: Run focused mobile checks.**

```powershell
npm --prefix mobile-app test -- --runInBand hooks/__tests__/useMessaging.test.ts hooks/__tests__/useMessagingUnread.test.ts utils/__tests__/messagingRefresh.test.ts utils/__tests__/messaging-retry.test.ts utils/__tests__/messagingRateLimit.test.ts
```

Expected: all focused cases pass, including existing send cooldown/idempotency tests. Review the change before starting the backend task.

### Task 2: Route realtime events to authorized recipients and emit distinct read receipts

**Files:**
- Modify: `server/services/messaging.ts`
- Modify: `server/types/messaging.ts`
- Modify: `server/routes/conversations.ts`
- Test: `server/services/__tests__/messaging.test.ts`
- Test: `server/routes/__tests__/conversations.test.ts`

**Interfaces:**
- Add internal type `MessagingDeliveryTarget = { userId: string; requestId: string }`.
- Export `listConversationDeliveryTargets(conversationId: string, actorId: string): Promise<MessagingDeliveryTarget[]>` from the messaging service. The actor must pass `assertParticipant()` before targets are returned.
- Preserve `conversation-message` and message-related `conversation-updated` payloads. Read writes emit only `conversation-read`, preserving its existing payload and REST response.

- [ ] **Step 1: Extend the existing route mocks and write failing fanout tests.** Add the target helper to the existing `vi.hoisted()` messaging mock and give it authorized admin/rider defaults in `beforeEach`. Attach an IO spy to the test Express app, resetting recorded events between tests.

```ts
const emitted: Array<{ rooms: string[]; event: string; payload: any }> = [];
const io = {
  to: vi.fn((rooms: string | string[]) => ({
    emit: (event: string, payload: any) => {
      emitted.push({ rooms: Array.isArray(rooms) ? rooms : [rooms], event, payload });
    },
  })),
};
app.set('io', io);

it('delivers a rider reply to admin and rider user rooms once', async () => {
  messaging.createMessage.mockResolvedValue({ id: 'msg-live', conversationId: 'conv-1', body: 'reply' });
  messaging.listConversationDeliveryTargets.mockResolvedValue([
    { userId: 'admin-1', requestId: 'req-1' },
    { userId: 'rider-1', requestId: 'req-1' },
  ]);
  const response = await request(app).post('/api/conversations/conv-1/messages')
    .set('x-test-user', 'rider-1:rider')
    .send({ clientMessageId: '11111111-1111-4111-8111-111111111111', body: 'reply' });
  expect(response.status).toBe(201);
  const events = emitted.filter(item => item.event === 'conversation-message');
  expect(events).toHaveLength(1);
  expect(events[0].rooms.slice().sort()).toEqual(['admin-1', 'rider-1']);
});

it('emits a receipt without creating a conversation-updated event', async () => {
  messaging.markConversationRead.mockResolvedValue({ readAt: '2026-10-03 10:00:00.000000' });
  const response = await request(app).put('/api/conversations/conv-1/read')
    .set('x-test-user', 'rider-1:rider');
  expect(response.status).toBe(200);
  expect(emitted.filter(item => item.event === 'conversation-read')).toHaveLength(1);
  expect(emitted.some(item => item.event === 'conversation-updated')).toBe(false);
});
```

- [ ] **Step 2: Run those regressions on the current implementation.**

```powershell
npx --no-install vitest run server/routes/__tests__/conversations.test.ts server/services/__tests__/messaging.test.ts
```

Expected: recipient-room and read-event assertions fail. Do not change the existing limiter test to make a fanout regression pass.

- [ ] **Step 3: Add the authoritative delivery-target helper.** Use existing `assertParticipant()` and map/deduplicate the results of this query. Match the helper's internal type to `server/types/messaging.ts`.

```ts
await assertParticipant(pool as unknown as Queryable, conversationId, actorId);
const [rows] = await pool.query(`
  SELECT DISTINCT cp.user_id, c.request_id
  FROM conversation_participants cp
  JOIN conversations c ON c.id = cp.conversation_id
  JOIN users participant ON participant.id = cp.user_id
  JOIN delivery_requests dr ON dr.request_id = c.request_id
  WHERE cp.conversation_id = ?
    AND (
      participant.role = 'admin'
      OR (participant.role = 'rider'
          AND cp.user_id = c.rider_id
          AND cp.user_id = dr.assigned_rider_id)
    )
`, [conversationId]);
```

Add service tests that require actor authorization before target lookup, verify the current role/current-assignment predicates, map SQL IDs to strings, and return unique targets. Preserve the existing former-rider, stale-assignment, closed-conversation, and per-admin unread tests.

- [ ] **Step 4: Replace both route fanouts after persistence.**

```ts
// In POST /:id/messages, after createMessage() returns its saved message:
const targets = await listConversationDeliveryTargets(conversationId, req.user!.id);
const userIds = [...new Set(targets.map(target => target.userId))];
if (io && userIds.length > 0) {
  io.to(userIds).emit('conversation-message', { conversationId, message });
  io.to(userIds).emit('conversation-updated', { conversationId, lastMessage: message });
}
const pushTargets = targets.filter(target => target.userId !== req.user!.id);
// Pass each pushTargets entry's userId/requestId to the existing push call.

// In PUT /:id/read, after markConversationRead() returns:
if (io && userIds.length > 0) {
  io.to(userIds).emit('conversation-read', { conversationId, userId: req.user!.id, ...result });
}
```

The read route resolves its own `targets` and `userIds` using the same helper. Remove separate sender/conversation-room emissions; a room union emits once per socket even when several target rooms overlap. Do not use `admin-room`.

Keep delivery/push work in a separate error boundary after persistence. A rejected target lookup produces a sanitized warning and still returns the saved message with 201, or the saved receipt with 200. Never bypass target authorization as a fallback. Continue using the existing push-failure handling.

- [ ] **Step 5: Add both-direction, failure, and security regressions.** Parameterize send actors as admin/rider and expect the same authorized user-room union. Reject persistence and assert no event emission. Reject target lookup after persistence and assert 201/200 with no unauthorized fallback. Reject push and assert the saved 201 response. Assert push excludes the sender and uses only authorized target IDs. Assert no event targets a conversation room or `admin-room`, including when a stale rider remains in one. Retain the existing 30-per-minute and independent-user limiter tests unchanged.

- [ ] **Step 6: Rerun focused server tests.**

```powershell
npx --no-install vitest run server/services/__tests__/messaging.test.ts server/routes/__tests__/conversations.test.ts
```

Expected: all cases pass. Review permission filtering and post-persistence failures before proceeding.

### Task 3: Make the admin consume messages, receipts, and reconnects without redundant history requests

**Files:**
- Modify: `src/app/utils/messaging.ts`
- Modify: `src/app/pages/Admin/AdminMessaging.tsx`
- Test: `tests/unit/admin-messaging.test.ts`
- Create test: `tests/unit/admin-messaging-events.test.ts`

**Interfaces:**
- Add event types in `messaging.ts`: `ConversationMessageEvent = { conversationId: string; message: ConversationMessage }`, `ConversationReadEvent = { conversationId: string; userId: string; readAt: string }`, and `ConversationUpdatedEvent = { conversationId: string; lastMessage?: ConversationMessage; userId?: string; readAt?: string }`.
- Export `applyConversationRead(conversations: ConversationSummary[], receipt: ConversationReadEvent, actorId: string): ConversationSummary[]`; only the matching conversation read by `actorId` gets unreadCount zero.
- Export `mergeFetchedAdminMessages(current: ConversationMessage[], fetched: ConversationMessage[]): ConversationMessage[]`; merge by server ID/clientMessageId, retain canonical messages received during an in-flight snapshot, and preserve oldest-first web ordering. Use the canonical backend timestamps consistently rather than reinterpreting their timezone.
- Extend `mergeConversationMessage(conversations, message, activeConversationId?, actorId?)` so the actor's own message never increments unread count, and a visible conversation is treated as read locally.
- Export `subscribeAdminMessaging(socket: Pick<Socket, 'on' | 'off'>, handlers: { onMessage: (payload: ConversationMessageEvent) => void; onRead: (payload: ConversationReadEvent) => void; onMetadata: (payload: ConversationUpdatedEvent) => void; onConnect: () => void }): () => void`. Register `conversation-message`, `conversation-read`, `conversation-updated`, and `connect`. Route legacy updates with both `userId` and `readAt` to `onRead`, not `onMetadata`. Cleanup removes the exact registered callbacks.
- No changes to `DataContext` or `RealTimeContext` contracts are necessary.

- [ ] **Step 1: Write receipt and subscription behavior tests.** Reuse the existing full summary fixture. In the new test file, use an event-emitter-style fake socket whose `on`/`off` methods store/remove callback references.

```ts
it('does not clear another admin unread count', () => {
  const current = [summary({ unreadCount: 3 })];
  expect(applyConversationRead(current, {
    conversationId: 'conversation-1', userId: 'admin-other', readAt: '2026-10-03 10:00:00',
  }, 'admin-me')[0].unreadCount).toBe(3);
});

it('routes legacy receipt updates without requesting metadata', () => {
  const callbacks = new Map<string, (...args: any[]) => void>();
  const fakeSocket = {
    on: vi.fn((event: string, callback: (...args: any[]) => void) => { callbacks.set(event, callback); }),
    off: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (callbacks.get(event) === callback) callbacks.delete(event);
    }),
  };
  const handlers = { onMessage: vi.fn(), onRead: vi.fn(), onMetadata: vi.fn(), onConnect: vi.fn() };
  const cleanup = subscribeAdminMessaging(fakeSocket as unknown as Pick<Socket, 'on' | 'off'>, handlers);
  const receipt = { conversationId: 'conversation-1', userId: 'admin-me', readAt: '2026-10-03 10:00:00' };
  callbacks.get('conversation-updated')?.(receipt);
  expect(handlers.onRead).toHaveBeenCalledWith(receipt);
  expect(handlers.onMetadata).not.toHaveBeenCalled();
  cleanup();
  expect(callbacks.size).toBe(0);
});
```

Include cases for own receipt/matching conversation, own receipt/unrelated conversation, duplicate message IDs, own-message echoes, ordinary metadata updates, and connect callbacks. Import `Socket` only as a type from the existing socket.io-client dependency.

```ts
it('keeps a socket message when an older history snapshot resolves', () => {
  const older = message({ id: 'older', clientMessageId: 'older-client', createdAt: '2026-10-03 10:00:00.000000' });
  const newer = message({ id: 'newer', clientMessageId: 'newer-client', createdAt: '2026-10-03 10:00:01.000000' });
  expect(mergeFetchedAdminMessages([older, newer], [older]).map(item => item.id))
    .toEqual(['older', 'newer']);
});
```

The existing `message()` fixture in `admin-messaging.test.ts` supplies the remaining required fields.

- [ ] **Step 2: Run the tests before implementation.**

```powershell
npx --no-install vitest run tests/unit/admin-messaging.test.ts tests/unit/admin-messaging-events.test.ts
```

Expected: failures for the new absent helpers.

- [ ] **Step 3: Implement helpers and integrate their event handlers.**

```ts
export function applyConversationRead(
  conversations: ConversationSummary[], receipt: ConversationReadEvent, actorId: string,
): ConversationSummary[] {
  if (receipt.userId !== actorId) return conversations;
  return conversations.map(item => item.id === receipt.conversationId
    ? { ...item, unreadCount: 0 } : item);
}

// AdminMessaging receipt callback:
const handleRead = (payload: ConversationReadEvent) => {
  setConversations(current => applyConversationRead(current, payload, user!.id));
};
```

Use `subscribeAdminMessaging()` in the existing socket effect. The receipt callback must contain no history fetch or read PUT. The metadata callback merges a known `lastMessage` without refetching history; unknown threads request a coalesced inbox fetch. Deduplicate incoming messages outside state updaters using refs, and only acknowledge a unique message sent by a different user when its thread is visible.

Visibility must distinguish desktop conversation view from a narrow-screen sheet that has closed while `selectedId` is still set. Preserve accessible labels and existing composer behavior.

- [ ] **Step 4: Protect refreshes and reconnects.** Store one in-flight inbox promise; repeated unknown-thread events request at most one trailing reconciliation. Snapshot failures clear pending automatic work and remain visible through the existing error state. Store one in-flight promise per selected thread, apply `mergeFetchedAdminMessages()` to the server's reversed history page, and discard a response after selection changes. A `connect` callback requests inbox recovery and the visible thread's recovery once; do not refresh on read receipts or routine renders. Cleanup removes listeners and pending work. Own-message POST responses and socket echoes use the same canonical ID guard.

```ts
// After confirming that conversationId still matches the selected ID:
setMessages(current => mergeFetchedAdminMessages(current, data.messages.slice().reverse()));
```

- [ ] **Step 5: Run helper tests and pin component behavior in Task 4.**

```powershell
npx --no-install vitest run tests/unit/admin-messaging.test.ts tests/unit/admin-messaging-events.test.ts
```

Expected: all event/state helpers pass. These helpers alone do not prove the mounted admin component has bounded requests; Task 4 supplies that check.

### Task 4: Verify real socket delivery and idle request counts

**Files:**
- Create: `server/routes/__tests__/messagingRealtime.integration.test.ts`
- Modify: `tests/messaging-e2e.spec.ts`
- Modify test harnesses from Tasks 1-3 only if a failing behavior case requires it

**Interfaces:**
- Isolated integration uses the actual conversation router, Express, `http.createServer`, the installed server Socket.IO `Server`, and the installed socket.io-client `io`; persistence and test authentication are mocked. Bind to `127.0.0.1` on an ephemeral port and always close clients/server.
- Development-fixture E2E requires `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_RIDER_EMAIL`, `E2E_RIDER_PASSWORD`, and an existing request assigned to that dedicated rider. Use the existing `BASE_URL`/`API_BASE_URL` configuration. Do not embed passwords or use production accounts.
- E2E logs into the admin browser through the actual login page, opens Inbox through its labeled navigation control, and sends the rider reply through authenticated REST from the test fixture. Rider socket checks and the Task 1 hook tests cover the mobile event path; a physical rider app confirms device behavior.

- [ ] **Step 1: Add the isolated socket fanout regression.** Connect admin, rider, and unrelated clients to the test IO server. Test authentication attaches a known user ID and joins only that ID's room; no client joins a conversation room. Attach listeners before sending.

```ts
const adminEvents: ConversationMessage[] = [];
const riderEvents: ConversationMessage[] = [];
const outsiderEvents: ConversationMessage[] = [];
adminSocket.on('conversation-message', payload => adminEvents.push(payload.message));
riderSocket.on('conversation-message', payload => riderEvents.push(payload.message));
outsiderSocket.on('conversation-message', payload => outsiderEvents.push(payload.message));

await request(testHttpServer).post('/api/conversations/conv-1/messages')
  .set('x-test-user', 'rider-1:rider')
  .send({ clientMessageId: '11111111-1111-4111-8111-111111111111', body: 'socket reply' });

await vi.waitFor(() => {
  expect(adminEvents).toHaveLength(1);
  expect(riderEvents).toHaveLength(1);
});
expect(outsiderEvents).toHaveLength(0);
```

Use a final server-to-client barrier acknowledgement before asserting absence, so a late forbidden packet cannot escape the assertion. Repeat for an admin send. Add a former-rider socket to `conversation_conv-1` and `admin-room` in the test fixture; it must still receive no content. Add a socket in two authorized target rooms and assert it receives one packet, proving room-union deduplication.

- [ ] **Step 2: Test receipts, disconnection, and cleanup.** Observe one read event per authorized socket after a read PUT and zero update events for it. Verify the payload identifies the reader. Disconnect a recipient, persist another message, reconnect/join its user room, and verify REST catch-up returns the missed canonical item. No test may leave sockets, listeners, or HTTP servers open.

- [ ] **Step 3: Run isolated integration with focused regressions.**

```powershell
npx --no-install vitest run server/routes/__tests__/messagingRealtime.integration.test.ts server/routes/__tests__/conversations.test.ts server/services/__tests__/messaging.test.ts tests/unit/admin-messaging.test.ts tests/unit/admin-messaging-events.test.ts
```

Expected: delivery to both sides, no outsider/stale-room packets, one receipt, and no leaked handles. Mocked-persistence integration does not replace current-assignment service tests.

- [ ] **Step 4: Extend the development-fixture Playwright test to exercise the mounted admin UI.** Keep the existing persistence lifecycle test. Add a browser test that logs in, opens Inbox, selects the dedicated rider thread, and records browser conversation requests and HTTP 429 responses. Use a unique body for the rider reply and assert the visible message appears without selecting the thread again.

```ts
const conversationRequests: Array<{ method: string; url: string }> = [];
const limitedResponses: string[] = [];
page.on('request', req => {
  if (req.url().includes('/api/conversations')) {
    conversationRequests.push({ method: req.method(), url: req.url() });
  }
});
page.on('response', res => {
  if (res.status() === 429 && res.url().includes('/api/')) limitedResponses.push(res.url());
});

const replyBody = `Realtime reply ${crypto.randomUUID()}`;
await riderApi.post(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
  data: { clientMessageId: crypto.randomUUID(), body: replyBody },
});
await expect(page.getByText(replyBody, { exact: true })).toBeVisible({ timeout: 5000 });

// Let the bounded event queue settle before establishing the idle baseline.
await page.waitForTimeout(1500);
const threadCalls = () => conversationRequests.filter(item =>
  item.url.includes(`/conversations/${conversationId}/messages`)
  || item.url.includes(`/conversations/${conversationId}/read`)).length;
const baseline = threadCalls();
await page.waitForTimeout(30_000);
expect(threadCalls()).toBe(baseline);
expect(limitedResponses).toEqual([]);
```

The 5-second assertion is a test upper bound, not a product latency guarantee. Observe expected prompt delivery locally. Add a second browser case that receives a peer read receipt and checks that thread GET/read PUT counters do not increase. Include the narrow-screen sheet-closed case: incoming messages remain unread and are not acknowledged until the sheet opens.

Run against the dedicated development fixture with the existing dev servers:

```powershell
npx --no-install playwright test tests/messaging-e2e.spec.ts --project=chromium --reporter=line
```

Missing credentials or an assigned request are an unexecuted live check, not passing verification. The new required live cases should fail with a clear fixture message rather than silently skip.

- [ ] **Step 5: Verify a physical rider app and reconnect.** Open the same fixture thread on the app and browser. Send one message each way and observe delivery without refreshing. After initial work settles, capture backend request counts for 30 idle seconds and confirm zero extra thread GETs/read PUTs/message POSTs. Disconnect the rider app, send an admin message, reconnect, and confirm it appears once. Keep one rider send pending while reconnecting and confirm its bubble is reconciled rather than erased. Repeat with the admin conversation sheet closed and reopened. Any temporary logging records only method, path, status, room IDs, and event names; remove it before handoff.

### Task 5: Run the full quality gate, refresh the graph, and hand off evidence

**Files:**
- Generated after code changes: `graphify-out/`
- Update this plan's checkboxes and record verification results in the final implementation report

**Interfaces:**
- Consume all code/test changes from Tasks 1-4.
- Produce fresh evidence for lint, typecheck, test, and build, plus socket/mobile/browser acceptance evidence. Plan creation alone does not execute these checks.

- [x] **Step 1: Lint every affected package.** From the repository root:

```powershell
npm --prefix mobile-app run lint
node mobile-app/node_modules/eslint/bin/eslint.js --config mobile-app/eslint.config.js src/app/pages/Admin/AdminMessaging.tsx src/app/utils/messaging.ts tests/unit/admin-messaging.test.ts tests/unit/admin-messaging-events.test.ts tests/messaging-e2e.spec.ts server/routes/conversations.ts server/services/messaging.ts server/types/messaging.ts server/services/__tests__/messaging.test.ts server/routes/__tests__/conversations.test.ts server/routes/__tests__/messagingRealtime.integration.test.ts
```

Root/server have no lint script or their own configuration. The second command is the closest existing-tool equivalent using the repository's installed Expo ESLint configuration. Report that distinction. If the configuration rejects those paths, ignores them, or cannot lint their syntax, the web/server lint stage remains missing: do not call it passed or complete. Do not install packages, add scripts, suppress rules, or weaken checks to conceal that gap.

- [ ] **Step 2: Typecheck mobile, root web, and server.** Start only after lint has usable passing evidence.

```powershell
Push-Location mobile-app
npx --no-install tsc --noEmit
Pop-Location
node server/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
node server/node_modules/typescript/bin/tsc --noEmit -p server/tsconfig.json
```

The root has no installed TypeScript binary; use the existing server compiler instead of letting npx install one. A root project-reference or unrelated dirty-tree failure is still a failed typecheck and must be reported. On any failure, stop, fix within scope, and restart from lint; if fixing requires unrelated changes, report the concrete blocker.

- [ ] **Step 3: Run the full applicable test stage.**

```powershell
npm --prefix mobile-app test -- --runInBand
npx --no-install vitest run tests/unit server/services/__tests__/messaging.test.ts server/routes/__tests__/conversations.test.ts server/routes/__tests__/messagingRealtime.integration.test.ts
npx --no-install playwright test tests/messaging-e2e.spec.ts --project=chromium --reporter=line
```

Inspect every result and report fixture-dependent cases separately. A skipped or unexecuted required live case does not count as a passed test stage. On failure, fix the cause and rerun the gate from lint.

- [ ] **Step 4: Build all affected packages.**

```powershell
Push-Location mobile-app
npx --no-install expo export --platform web
Pop-Location
npm run build:frontend
npm --prefix server run build
```

These web/server commands produce the documented frontend/backend artifacts without `npm run build`'s embedded `npm install`. Do not install dependencies to make a gate pass without authorization. The Expo web export does not replace the physical-device acceptance check in Task 4.

- [ ] **Step 5: Update the graph after code changes and inspect the diff.**

```powershell
graphify update .
git diff --check
git status --short
```

Graph generation is AST-only. Preserve pre-existing graph changes and unrelated files. Remove only temporary diagnostic code introduced for this repair. If removal changes executable code, rerun the gate from lint.

- [ ] **Step 6: Hand off the implementation evidence and remaining rollout requirements.** Name every quality-gate command and its result, including missing lint support and pre-existing failures. Report measured request counts and which socket, browser, and physical-device cases ran. Existing clients may need their updated bundle loaded; previously exhausted global limiter windows may need the actual Retry-After period to expire. Keep deployment a separately authorized action and do not reset limiter state to make the idle regression appear green.

## Completion criteria

Tasks 1-5 have fresh passing evidence, rider replies and admin messages both reach the other participant, the idle mobile conversation stops generating requests, unauthorized/stale sockets receive no content, and reconnect catches up without duplicate or lost pending messages. A written plan, a mock-only test, or a raised rate limit alone is not completion.
