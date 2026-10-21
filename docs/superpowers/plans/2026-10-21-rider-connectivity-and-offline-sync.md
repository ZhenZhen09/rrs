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

- [ ] **Step 1: Write a failing route test** for a rider status request whose first response is lost, followed by the same key after an artificial 25-hour clock advance. In the test file, define `sendStatus(key, body)` against the mounted Express route and `statusLogCount(key)` against its mocked transaction store. Assert one status update and one status log, with the same canonical response on replay. Add a second case with the same key and different payload returning 409.

```ts
vi.useFakeTimers();
expect(await sendStatus('op-1', { status: 'completed' })).toMatchObject({ operationId: 'op-1', deliveryStatus: 'completed' });
vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
expect(await sendStatus('op-1', { status: 'completed' })).toMatchObject({ operationId: 'op-1', deliveryStatus: 'completed' });
expect(statusLogCount('op-1')).toBe(1);
expect((await sendStatus('op-1', { status: 'failed' })).status).toBe(409);
```

- [ ] **Step 2: Run the focused server test** with `npx vitest run server/routes/__tests__/riderStatusOperations.test.ts`; confirm the replay or conflict assertions fail.
- [ ] **Step 3: Add the operation table and transaction logic.** Use a unique `(rider_id, operation_id)` key, `request_id`, SHA-256 hash of canonical `{requestId, status, remark, timestamp}`, canonical status, and response JSON. Under the existing delivery row lock, check the record first, reject a changed payload, then write the status, log, and operation record in the same transaction. Return the recorded response on replay without publishing notifications again. Route rider status PUTs around the existing 24-hour asynchronous idempotency middleware; leave other routes unchanged.

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

- [ ] **Step 4: Rerun the focused test**; confirm replay, altered-payload conflict, assignment authorization, and terminal-state behavior pass. Commit only this task's files.

## Task 2: Durable, rider-scoped mobile status outbox

**Files:** Modify `mobile-app/services/localDb.ts`, `localDb.web.ts`, `syncQueue.ts`, `apiService.ts`; add or extend `mobile-app/services/__tests__/sync-queue-logic.test.ts`, `apiService.test.ts`.

**Interfaces:** `queueRiderStatus(input: { riderId: string; requestId: string; status: string; remark: string; timestamp: string }): Promise<{ operationId: string }>`; `getRiderStatusActions(riderId: string, requestId?: string): Promise<StatusAction[]>`; `processRiderStatusActions(riderId: string): Promise<void>`. `StatusAction.state` is `pending | syncing | acked | needs_attention`.

- [ ] **Step 1: Write failing persistence tests.** Insert an action, advance the clock beyond 24 hours, reopen the database, and assert it is still pending. Verify a row left `syncing` returns to `pending`, owner B cannot list owner A's rows, and an expired legacy row remains stored for quarantine instead of being sent under B.

```ts
jest.useFakeTimers();
const saved = await queueRiderStatus({ riderId: 'A', requestId: 'R1', status: 'completed', remark: '', timestamp: '2026-10-21T00:00:00.000Z' });
jest.setSystemTime(Date.now() + 48 * 60 * 60 * 1000);
expect((await getRiderStatusActions('A', 'R1'))[0].operationId).toBe(saved.operationId);
expect(await getRiderStatusActions('B', 'R1')).toEqual([]);
```

- [ ] **Step 2: Run** `npm test -- --runInBand services/__tests__/sync-queue-logic.test.ts services/__tests__/apiService.test.ts` from `mobile-app`; confirm new cases fail.
- [ ] **Step 3: Migrate SQLite without dropping rows.** Add `rider_id`, `request_id`, and action state columns or a focused rider action table; preserve old `sync_queue` rows. Quarantine unowned legacy status rows. Remove `expires_at > now` filtering for rider actions, recover `syncing` on startup, and keep ordered retries per request. Make web adapter queries match native semantics.

```ts
export type StatusAction = {
  operationId: string; riderId: string; requestId: string;
  status: string; remark: string; timestamp: string;
  state: 'pending' | 'syncing' | 'acked' | 'needs_attention';
  lastError: string | null;
};
```

- [ ] **Step 4: Change `updateJobStatus` to save first and reuse one operation ID** for direct send and retries. Return `{ queued: true, operationId }` only after SQLite confirms the save; return `{ queued: false, operationId, deliveryStatus }` after server acknowledgment. Reject the action if SQLite cannot save it. Mark 4xx conflicts `needs_attention`, keep transient errors pending, and never delete unacknowledged rider actions.
- [ ] **Step 5: Rerun focused tests** and commit only this task's files.

### Task 3: Cold-launch delivery cache and account isolation

**Files:** Modify `mobile-app/services/apiService.ts`, `mobile-app/hooks/data/useJobDetails.ts`, `mobile-app/context/AuthContext.tsx`, `mobile-app/app/(tabs)/index.tsx`; extend `mobile-app/services/__tests__/apiService.test.ts` and `mobile-app/app/__tests__/today-start-shift.test.tsx`.

**Interfaces:** `getCachedTasks(riderId: string): Promise<Job[]>`; `getCachedJob(riderId: string, requestId: string): Promise<Job | null>`. The cache is scoped to the authenticated or locally stored rider ID.

- [ ] **Step 1: Write failing tests** for online cache write, cold offline job read, no cached job message, and a second rider being unable to read the first rider's job. Include explicit logout followed by offline reopening; cached details remain hidden until the original rider signs in.

```ts
expect((await getCachedJob('rider-A', 'request-1'))?.request_id).toBe('request-1');
expect(await getCachedJob('rider-B', 'request-1')).toBeNull();
```

- [ ] **Step 2: Run** `npm test -- --runInBand services/__tests__/apiService.test.ts app/__tests__/today-start-shift.test.tsx` from `mobile-app`; confirm new cases fail.
- [ ] **Step 3: Save task data under rider-scoped cache keys** and persist the full job response whenever it is fetched online. Restore job details from SQLite before an API refresh. Preserve last-update time, address, contacts, instructions, and status. On explicit logout, hide cached details and pending actions; keep their rows for the same rider's future sign-in. Show a warning before logout when actions remain pending.

```ts
const cacheKey = `active_tasks:${riderId}`;
export async function getCachedJob(riderId: string, requestId: string) {
  return (await getCachedTasks(riderId)).find(job => String(job.request_id) === requestId) ?? null;
}
```

- [ ] **Step 4: Rerun focused tests** and commit only this task's files.

### Task 4: Shared connection classification

**Files:** Create `mobile-app/services/connectionState.ts`, `mobile-app/context/ConnectionContext.tsx`, `mobile-app/services/__tests__/connectionState.test.ts`; modify `mobile-app/app/_layout.tsx`, `login.tsx`.

**Interfaces:** `ConnectionState = 'checking' | 'online' | 'no_network' | 'service_unavailable'`; `useConnection(): { state: ConnectionState; retry: () => Promise<void>; lastOnlineAt: number | null }`. The provider owns NetInfo, `/api/ping`, app foreground checks, and one bounded retry timer.

- [ ] **Step 1: Write failing classifier tests** for unknown NetInfo, confirmed disconnect, reachable transport with failed ping, and successful ping. Add a provider test that a stale slower probe cannot replace a newer online result.

```ts
expect(classifyConnection({ isConnected: null, isInternetReachable: null }, null)).toBe('checking');
expect(classifyConnection({ isConnected: false, isInternetReachable: false }, null)).toBe('no_network');
expect(classifyConnection({ isConnected: true, isInternetReachable: true }, false)).toBe('service_unavailable');
expect(classifyConnection({ isConnected: true, isInternetReachable: true }, true)).toBe('online');
```

- [ ] **Step 2: Run** `npm test -- --runInBand services/__tests__/connectionState.test.ts` from `mobile-app`; confirm the classifier is missing or wrong.
- [ ] **Step 3: Implement a finite-timeout ping and shared provider.** Cancel or version stale probes, check on startup and foreground, and retry while unavailable with one timer. Replace the separate login polling loop and make the root layout consume this state without blocking a saved active delivery.
- [ ] **Step 4: Rerun focused tests** and commit only this task's files.

### Task 5: Offline dashboard and delivery feedback

**Files:** Modify `mobile-app/components/ui/OfflineBanner.tsx`, `DashboardTransitionOverlay.tsx`, `mobile-app/app/(tabs)/index.tsx`, `mobile-app/app/job/[id].tsx`, `mobile-app/hooks/data/useJobDetails.ts`; add or extend `mobile-app/app/__tests__/offline-connectivity.test.tsx`.

**Interfaces:** Consume `useConnection()` from Task 4 and `getRiderStatusActions()` from Task 2. Display states derive from persisted rows, never only from a mutation callback.

- [ ] **Step 1: Write failing screen tests.** Unknown state keeps the logo and “Checking connection”; `no_network` shows “No Internet Connection”; a failed ping with working transport shows “Cannot reach Errands”; an active saved delivery opens from the offline dashboard; queued status shows “Pending sync” after remount, and server acknowledgment changes it to “Synced”.

```tsx
expect(screen.getByText('No Internet Connection')).toBeTruthy();
expect(screen.getByText(/new assignments and important updates/i)).toBeTruthy();
expect(screen.getByText(/Pending sync/i)).toBeTruthy();
```

- [ ] **Step 2: Run** `npm test -- --runInBand app/__tests__/offline-connectivity.test.tsx` from `mobile-app`; confirm new cases fail.
- [ ] **Step 3: Render the four connection states and persistent action states.** Keep a saved active-delivery card above the offline notice; show last-saved time and `Needs attention` for rejected actions. Use Retry everywhere. Android's recovery action must be tested under lock task mode before labeling it “Open Network Settings”; iOS shows IT recovery instructions unless a confirmed route exists. Do not make `/api/ping` success alone clear a pending action.
- [ ] **Step 4: Rerun focused tests** and commit only this task's files.

### Task 6: Reconnect, location outbox, and conflict handling

**Files:** Modify `mobile-app/services/SyncManager.ts`, `syncQueue.ts`, `locationOutbox.ts`, `locationSyncService.ts`; extend `mobile-app/services/__tests__/sync-queue-logic.test.ts`, `locationOutbox.test.ts`, `locationSyncService.test.ts`.

**Interfaces:** `triggerSync()` uses `ConnectionState === 'online'`, processes rider status actions in order, then flushes location events, then invalidates task queries. A location event remains stored until accepted or explicitly rejected.

- [ ] **Step 1: Write failing tests** for a 73-hour-old pending location event remaining selectable, rejected event remaining stored with its reason, duplicate status replay producing one acknowledgment, an interrupted `syncing` action retrying, and a status conflict stopping later actions for that delivery.

```ts
jest.useFakeTimers();
await appendLocationEvent(event);
jest.setSystemTime(Date.now() + 73 * 60 * 60 * 1000);
expect((await getPendingLocationEvents()).map(x => x.eventId)).toContain(event.eventId);
```

- [ ] **Step 2: Run** `npm test -- --runInBand services/__tests__/locationOutbox.test.ts services/__tests__/locationSyncService.test.ts services/__tests__/sync-queue-logic.test.ts` from `mobile-app`; confirm new cases fail.
- [ ] **Step 3: Remove silent location expiry filters** from native and web adapters. Ensure the older `updateLocationBackground` generic-queue path also retains unsent coordinates until acknowledgment or explicit rejection. Keep rejected rows inspectable. On a confirmed service reconnect, retry pending status actions with the stable operation ID, apply server acknowledgments, flush location batches, and refresh tasks. Mark permanent status conflicts `needs_attention` and stop dependent actions on that request. Expose outbox count and last error to the delivery UI. On storage failure, report that the update was not saved.
- [ ] **Step 4: Rerun focused tests** and commit only this task's files.

### Task 7: End-to-end verification and deployment guidance

**Files:** Create `docs/operations/rider-managed-device-connectivity.md`; update focused tests only if a demonstrated gap remains.

**Interfaces:** None; validates Tasks 1–6 and gives IT a device setup and recovery checklist.

- [ ] **Step 1: Document the managed-device recovery route.** Include Android lock-task policy and allowed connectivity UI, iPhone app-lock and IT-provisioned Wi-Fi, how riders contact support, and a device-level acceptance checklist. State that device management controls are independent of connection loss.
- [ ] **Step 2: Exercise the full outage scenario** on a native development or managed test phone: online delivery → offline status → process restart → clock beyond 24 hours → reconnect → one server status log → `Synced`. Also exercise service outage with working Wi-Fi, server rejection, and a second rider on the same phone. Record results in the operations document.
- [ ] **Step 3: Run the quality gate in order.** Mobile: `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`, `npx expo export --platform web` from `mobile-app`. Server/root: report that no lint or test script exists, use `npx eslint` on affected server files and `npx vitest run server/routes/__tests__/riderStatusOperations.test.ts` as closest supported checks, then `npx tsc --noEmit -p server/tsconfig.json`; build with `npm run build:frontend` at root and `npm run build` inside `server` to avoid root `build:backend`'s implicit dependency installation. Stop on a failure, fix it, then rerun the full affected sequence from lint.
- [ ] **Step 4: Run** `graphify update .`; inspect the diff and commit only intended graph outputs and this task's documentation. Deploy the SQL migration and server before publishing the client. Confirm the managed-device recovery route on production policy before enabling the rider-facing settings label.
