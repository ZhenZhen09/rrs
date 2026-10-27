# Rider Connectivity and Offline Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let riders continue a saved delivery during an outage and show “Synced” only after Errands durably acknowledges every rider action.

**Architecture:** Reuse the app's SQLite task cache, status queue, and location outbox. Add a shared NetInfo plus `/api/ping` connection state, make rider actions durable and account-scoped, and add a transactional operation record to the existing server status endpoint. The UI reads persisted action states instead of inferring success from a local write.

**Tech Stack:** Expo 57, React Native, TypeScript, NetInfo, TanStack Query, expo-sqlite, Jest, Express, MySQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-21-rider-connectivity-and-offline-sync-design.md`

## Global Constraints

- Keep the active delivery accessible during a slow or failed service check.
- Distinguish `no_network` from `service_unavailable`; unknown NetInfo state is `checking`.
- Preserve unsent status and location data across app restarts and outages longer than 24 hours.
- Scope saved deliveries and actions to the original rider; explicit logout hides the cache until the same rider signs in.
- Do not label an iOS app-settings link as a Wi-Fi shortcut or change device lock state in the app.
- Server support must deploy before the mobile client depends on durable operation IDs.
- After code changes, run the quality gate in lint → typecheck → test → build order, then `graphify update .`.
- Preserve existing unrelated worktree changes; stage and commit only files touched by each task.

## Review Focus

1. A server commit followed by a lost response must replay the same operation ID and create one status log. Task 1 tests this.
2. A different rider signing in on a shared phone must neither see nor upload the first rider's pending data. Tasks 2 and 3 test this.
3. A cold launch after more than 24 hours offline must still open the saved active delivery and show pending actions. Tasks 2 and 3 test this.
4. Wi-Fi connected while `/api/ping` fails must say “Cannot reach Errands,” not “No Internet Connection.” Tasks 4 and 5 test this.
5. A process death while an action is `syncing`, or a permanently rejected GPS event, must remain recoverable or visible. Tasks 2 and 6 test this.

## Implementation Status — 2026-10-22

Implementation is present across Tasks 1–6, with operations guidance added for Task 7. The web adapter now also recovers interrupted writes and quarantines legacy status rows; active deliveries remain accessible during service outages even when Wi-Fi is up; each rejected location event retains its own server reason. Mobile lint, typecheck, all 71 Jest suites (301 tests), and web export passed; focused server replay tests, server typecheck/build, frontend build, and Graphify update passed. Server lint is unavailable: the server package has no lint script or ESLint config. Managed-device outage/restart/shared-account acceptance remains outstanding for the release operator. Deploy the SQL table and server before releasing the mobile app.

---

## File map

- `server/scripts/2026-10-21-rider-status-operations.sql`: deployable MySQL table for durable rider operation IDs.
- `server/services/riderStatusOperations.ts`: transactional lookup and record helpers for the status route.
- `server/routes/requests.ts`, `server/index.ts`: status transaction and middleware routing.
- `mobile-app/services/localDb.ts`, `localDb.web.ts`: SQLite migration and equivalent web adapter behavior.
- `mobile-app/services/syncQueue.ts`, `apiService.ts`: persisted status actions and acknowledgments.
- `mobile-app/services/locationOutbox.ts`, `locationSyncService.ts`: no silent location expiry or rejection.
- `mobile-app/services/connectionState.ts`, `mobile-app/context/ConnectionContext.tsx`: one connection classification and lifecycle.
- `mobile-app/services/SyncManager.ts`: ordered retries on confirmed reachability.
- `mobile-app/app/_layout.tsx`, `login.tsx`, `(tabs)/index.tsx`, `job/[id].tsx`, `mobile-app/hooks/data/useJobDetails.ts`, `mobile-app/components/ui/OfflineBanner.tsx`, `DashboardTransitionOverlay.tsx`: rider presentation.
- Focused tests live beside the affected mobile services and screens and under `server/routes/__tests__`.

### Task 1: Durable server acknowledgment for rider statuses

**Files:** Create `server/scripts/2026-10-21-rider-status-operations.sql`, `server/services/riderStatusOperations.ts`, `server/routes/__tests__/riderStatusOperations.test.ts`; modify `server/routes/requests.ts`, `server/index.ts`.

**Interfaces:** `findRiderOperation(connection, riderId, operationId): Promise<RecordedOperation | null>` and `recordRiderOperation(connection, row: RecordedOperation): Promise<void>`. Status `PUT /api/requests/:id/status` accepts `Idempotency-Key` and returns `{ operationId, deliveryStatus, ...existingResponse }` for riders.

- [x] **Step 1: Add route regression tests** for replay after a 25-hour clock advance, one status update/log, canonical response replay, changed-payload conflict, assignment authorization, and terminal-state behavior.

```ts
vi.useFakeTimers();
expect(await sendStatus('op-1', { status: 'completed' })).toMatchObject({ operationId: 'op-1', deliveryStatus: 'completed' });
vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
expect(await sendStatus('op-1', { status: 'completed' })).toMatchObject({ operationId: 'op-1', deliveryStatus: 'completed' });
expect(statusLogCount('op-1')).toBe(1);
expect((await sendStatus('op-1', { status: 'failed' })).status).toBe(409);
```

- [x] **Step 2: Run the focused server test** with `npx vitest run server/routes/__tests__/riderStatusOperations.test.ts`; all three tests pass.
- [x] **Step 3: Add the operation table and transaction logic.** Use a unique `(rider_id, operation_id)` key, `request_id`, SHA-256 hash of canonical `{requestId, status, remark, timestamp}`, canonical status, and response JSON. Under the existing delivery row lock, check the record first, reject a changed payload, then write the status, log, and operation record in the same transaction. Return the recorded response on replay without publishing notifications again. Route rider status PUTs around the existing 24-hour asynchronous idempotency middleware; leave other routes unchanged.

```sql
CREATE TABLE IF NOT EXISTS rider_status_operations (
  rider_id VARCHAR(191) NOT NULL,
  operation_id VARCHAR(191) NOT NULL,
  request_id VARCHAR(191) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  delivery_status VARCHAR(32) NOT NULL,
  response_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rider_id, operation_id)
);
```

- [x] **Step 4: Rerun the focused test**; replay, altered-payload conflict, assignment authorization, and terminal-state behavior pass. Changes remain uncommitted per repository instructions.

## Task 2: Durable, rider-scoped mobile status outbox

**Files:** Modify `mobile-app/services/localDb.ts`, `localDb.web.ts`, `syncQueue.ts`, `apiService.ts`; add or extend `mobile-app/services/__tests__/sync-queue-logic.test.ts`, `apiService.test.ts`.

**Interfaces:** `queueRiderStatus(input: { riderId: string; requestId: string; status: string; remark: string; timestamp: string }): Promise<{ operationId: string }>`; `getRiderStatusActions(riderId: string, requestId?: string): Promise<StatusAction[]>`; `processRiderStatusActions(riderId: string): Promise<void>`. `StatusAction.state` is `pending | syncing | acked | needs_attention`.

- [x] **Step 1: Add persistence and ownership regression tests.** Cover a 48-hour-old action, rider-filtered reads/uploads, native and web startup recovery from `syncing`, and quarantine of legacy status rows without deletion.

```ts
jest.useFakeTimers();
const saved = await queueRiderStatus({ riderId: 'A', requestId: 'R1', status: 'completed', remark: '', timestamp: '2026-10-21T00:00:00.000Z' });
jest.setSystemTime(Date.now() + 48 * 60 * 60 * 1000);
expect((await getRiderStatusActions('A', 'R1'))[0].operationId).toBe(saved.operationId);
expect(await getRiderStatusActions('B', 'R1')).toEqual([]);
```

- [x] **Step 2: Run the focused mobile persistence and API tests**; the suite passes.
- [x] **Step 3: Migrate SQLite without dropping rows.** Add a focused rider action table; preserve old `sync_queue` rows. Quarantine unowned legacy status rows. Keep rider actions independent of expiry, recover `syncing` on startup, and keep ordered retries per request. Make web adapter queries match native semantics.

```ts
export type StatusAction = {
  operationId: string; riderId: string; requestId: string;
  status: string; remark: string; timestamp: string;
  state: 'pending' | 'syncing' | 'acked' | 'needs_attention';
  lastError: string | null;
};
```

- [x] **Step 4: Change `updateJobStatus` to save first and reuse one operation ID** for direct send and retries. Return `{ queued: true, operationId }` only after SQLite confirms the save; return `{ queued: false, operationId, deliveryStatus }` after server acknowledgment. Reject the action if SQLite cannot save it. Mark 4xx conflicts `needs_attention`, keep transient errors pending, and never delete unacknowledged rider actions. Direct writes wait behind older unresolved writes.
- [x] **Step 5: Rerun focused tests**; persistence, queue ordering, and API tests pass.

### Task 3: Cold-launch delivery cache and account isolation

**Files:** Modify `mobile-app/services/apiService.ts`, `mobile-app/hooks/data/useJobDetails.ts`, `mobile-app/context/AuthContext.tsx`, `mobile-app/app/(tabs)/index.tsx`; extend `mobile-app/services/__tests__/apiService.test.ts` and `mobile-app/app/__tests__/today-start-shift.test.tsx`.

**Interfaces:** `getCachedTasks(riderId: string): Promise<Job[]>`; `getCachedJob(riderId: string, requestId: string): Promise<Job | null>`. The cache is scoped to the authenticated or locally stored rider ID.

- [x] **Step 1: Add cache and account-isolation regression tests** for online cache writes, cold offline reads, missing cached details, second-rider isolation, and rider-scoped in-memory query keys. Logout preserves local rows; access remains keyed to the authenticated rider.

```ts
expect((await getCachedJob('rider-A', 'request-1'))?.request_id).toBe('request-1');
expect(await getCachedJob('rider-B', 'request-1')).toBeNull();
```

- [x] **Step 2: Run the focused cache and dashboard tests**; the API, account-key, and saved-active-delivery tests pass.
- [x] **Step 3: Save task data under rider-scoped cache keys** and persist the full job response whenever it is fetched online. Restore job details from SQLite before an API refresh. Preserve last-update time, address, contacts, instructions, and status. On explicit logout, hide cached details and pending actions; keep their rows for the same rider's future sign-in. Show a warning before logout when actions remain pending.

```ts
const cacheKey = `active_tasks:${riderId}`;
export async function getCachedJob(riderId: string, requestId: string) {
  return (await getCachedTasks(riderId)).find(job => String(job.request_id) === requestId) ?? null;
}
```

- [x] **Step 4: Rerun focused tests**; cache and dashboard regressions pass. Changes remain uncommitted per repository instructions.

### Task 4: Shared connection classification

**Files:** Create `mobile-app/services/connectionState.ts`, `mobile-app/context/ConnectionContext.tsx`, `mobile-app/services/__tests__/connectionState.test.ts`; modify `mobile-app/app/_layout.tsx`, `login.tsx`.

**Interfaces:** `ConnectionState = 'checking' | 'online' | 'no_network' | 'service_unavailable'`; `useConnection(): { state: ConnectionState; retry: () => Promise<void>; lastOnlineAt: number | null }`. The provider owns NetInfo, `/api/ping`, app foreground checks, and one bounded retry timer.

- [x] **Step 1: Add classifier and provider regression tests** for unknown NetInfo, confirmed disconnect, reachable transport with failed ping, successful ping, and stale-probe suppression.

```ts
expect(classifyConnection({ isConnected: null, isInternetReachable: null }, null)).toBe('checking');
expect(classifyConnection({ isConnected: false, isInternetReachable: false }, null)).toBe('no_network');
expect(classifyConnection({ isConnected: true, isInternetReachable: true }, false)).toBe('service_unavailable');
expect(classifyConnection({ isConnected: true, isInternetReachable: true }, true)).toBe('online');
```

- [x] **Step 2: Run focused connection tests**; classifier and stale-probe tests pass.
- [x] **Step 3: Implement a finite-timeout ping and shared provider.** Cancel or version stale probes, check on startup and foreground, and retry while unavailable with one timer. Replace the separate login polling loop and make the root layout consume this state without blocking a saved active delivery.
- [x] **Step 4: Rerun focused tests**; tests pass. Changes remain uncommitted per repository instructions.

### Task 5: Offline dashboard and delivery feedback

**Files:** Modify `mobile-app/components/ui/OfflineBanner.tsx`, `DashboardTransitionOverlay.tsx`, `mobile-app/app/(tabs)/index.tsx`, `mobile-app/app/job/[id].tsx`, `mobile-app/hooks/data/useJobDetails.ts`; add or extend `mobile-app/app/__tests__/offline-connectivity.test.tsx`.

**Interfaces:** Consume `useConnection()` from Task 4 and `getRiderStatusActions()` from Task 2. Display states derive from persisted rows, never only from a mutation callback.

- [x] **Step 1: Add UI and persisted-state regression tests.** Checking retains the branded login; offline banners distinguish no internet from unavailable service; an active delivery stays accessible during a service outage with working Wi-Fi; action status remains pending until all saved actions are acknowledged.

```tsx
expect(screen.getByText('No Internet Connection')).toBeTruthy();
expect(screen.getByText(/new assignments and important updates/i)).toBeTruthy();
expect(screen.getByText(/Pending sync/i)).toBeTruthy();
```

- [x] **Step 2: Run focused login, offline-banner, dashboard, and persisted-status tests**; all pass.
- [x] **Step 3: Render connection and persistent action states.** Keep a saved active-delivery card accessible; show local save time and `Needs attention` with the rejection reason. Use Retry. Android/iOS recovery remains IT-guided; do not label an unverified settings shortcut. `/api/ping` success alone never clears a pending action.
- [x] **Step 4: Rerun focused tests**; tests pass. Changes remain uncommitted per repository instructions.

### Task 6: Reconnect, location outbox, and conflict handling

**Files:** Modify `mobile-app/services/SyncManager.ts`, `syncQueue.ts`, `locationOutbox.ts`, `locationSyncService.ts`; extend `mobile-app/services/__tests__/sync-queue-logic.test.ts`, `locationOutbox.test.ts`, `locationSyncService.test.ts`.

**Interfaces:** `triggerSync()` uses `ConnectionState === 'online'`, processes rider status actions in order, then flushes location events, then invalidates task queries. A location event remains stored until accepted or explicitly rejected.

- [x] **Step 1: Add regression tests** for a 73-hour-old location event, retained per-event location rejection reasons, duplicate status replay, interrupted `syncing` recovery, and status-conflict ordering.

```ts
jest.useFakeTimers();
await appendLocationEvent(event);
jest.setSystemTime(Date.now() + 73 * 60 * 60 * 1000);
expect((await getPendingLocationEvents()).map(x => x.eventId)).toContain(event.eventId);
```

- [x] **Step 2: Run focused outbox and sync tests**; tests pass.
- [x] **Step 3: Remove silent location expiry filters** from native and web adapters. Retain generic location queue data until acknowledgment or explicit rejection. Keep rejected rows inspectable. On confirmed reconnect, retry statuses in order with stable IDs, then generic queue and location batches, and refresh caches. Mark permanent status conflicts `needs_attention` and block later actions for that request. Expose outbox count and last error. A failed primary status write is reported as unsaved.
- [x] **Step 4: Rerun focused tests**; tests pass. Changes remain uncommitted per repository instructions.

### Task 7: End-to-end verification and deployment guidance

**Files:** Create `docs/operations/rider-managed-device-connectivity.md`; update focused tests only if a demonstrated gap remains.

**Interfaces:** None; validates Tasks 1–6 and gives IT a device setup and recovery checklist.

- [x] **Step 1: Document the managed-device recovery route** in `docs/operations/rider-managed-device-connectivity.md`, including device policy, IT support, and acceptance checklist.
- [ ] **Step 2: Exercise the full outage scenario** on a native development or managed test phone: online delivery → offline status → process restart → clock beyond 24 hours → reconnect → one server status log → `Synced`. Also exercise service outage with working Wi-Fi, server rejection, and a second rider on the same phone. Record results in the operations document. The `Pixel_3a_API_34_extension_level_7_x86_64` AVD was attached, but the native build is blocked because the local NDK installation is incomplete (`source.properties` is missing). SDK Manager repair was stopped before completion; no emulator scenario was exercised. The AVD is unmanaged and cannot verify the required lock-task/network-recovery policy; release acceptance remains open.
- [x] **Step 3: Run the available quality gates in order.** Mobile lint, typecheck, all Jest tests, and web export pass. Server typecheck, focused Vitest, and build pass. Root frontend build passes. The server package has no lint script or ESLint config, so server lint is unavailable; no server-wide test script exists.
- [x] **Step 4: Run `graphify update .`**; graph outputs refreshed. Changes remain uncommitted per repository instructions.
- [ ] **Release action:** Deploy `server/scripts/2026-10-21-rider-status-operations.sql` and the server before the mobile client; verify the managed-device recovery route against production Android/iOS policies.
