# Lean Dispatch Assignment and Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rider assignment a single-choice action and persist one authoritative active queue per rider across all assignment and route-order paths.

**Architecture:** Add pure queue-sequence validation plus a transaction-scoped queue service. Route direct approval, batch approval/reassignment, and manual resequencing through that service. Keep the details panel as the single rider choice for an individual assignment; make route review optional and rider-scoped, and make queue ranks consistent across Active and Overdue views.

**Tech Stack:** Express/TypeScript, MySQL2 transactions, React, Vitest, React Testing Library.

**Spec:** [2026-10-08-lean-dispatch-assignment-queue-design.md](../specs/2026-10-08-lean-dispatch-assignment-queue-design.md)

**Historical reference:** `docs/superpowers/specs/2024-05-30-single-approval-interceptor-design.md` describes automatically opening The Interceptor for a single assignment. This plan supersedes that trigger while retaining manual route review.

## Global Constraints

- Preserve existing authorization, rider availability checks, audit events, notifications, and socket refreshes.
- One active queue is scoped to one rider across delivery dates; overdue tasks remain in that queue until terminal.
- Never allow the UI to choose a rider twice for a single-task assignment or route review.
- A submitted reorder must be an exact permutation of the authoritative active queue; do not silently accept missing, duplicate, unknown, or foreign-rider task IDs.
- Tasks in `in_progress`, `arrived`, `picked_up`, `arrived_at_pickup`, or `arrived_at_dropoff` are started; they remain ahead of unstarted tasks and retain their relative order.
- Keep transactions all-or-nothing; publish success notifications only after commit.
- Do not install dependencies or weaken checks.

## Review Focus

- **Two simultaneous assignments to one rider:** both should serialize and receive distinct consecutive ranks; test in Task 2.
- **A stale route review after another admin assigns a task:** reject and refresh without partial assignment or order changes; test in Task 3.
- **Batch assignment with existing work:** preserve the existing queue and append the selected new tasks in the batch's chosen order; test in Task 3.
- **A queue containing overdue and started work:** overdue work remains in sequence and started work cannot be moved behind unstarted work; test in Tasks 1 and 3.
- **Two riders each having a first task:** rank 1 is valid for both, and cards make the associated rider visible; test in Task 5.

---

### Task 1: Define and test queue sequence invariants

**Files:**
- Create: `server/utils/riderQueue.ts`
- Test: `server/utils/__tests__/riderQueue.test.ts`

**Interfaces:**
- Produces `appendIncomingTasks(currentQueue, incomingIds, incomingOrder?)`, returning the complete ordered ID list.
- Produces `validateQueueReplacement(currentTasks, submittedIds)`, returning the validated ordered ID list or throwing a typed validation error.
- A queue item has `{ request_id: string; delivery_status: string | null; queue_order: number | null }`.

- [ ] **Step 1: Write failing tests for append and order validation**

Add these behavior cases using literal expected arrays:

```ts
it('appends newly assigned work after the existing rider queue', () => {
  expect(appendIncomingTasks(['old-1', 'old-2'], ['new-1', 'new-2']))
    .toEqual(['old-1', 'old-2', 'new-1', 'new-2']);
});

it('keeps the chosen order within the incoming batch', () => {
  expect(appendIncomingTasks(['old-1'], ['new-1', 'new-2'], ['new-2', 'new-1']))
    .toEqual(['old-1', 'new-2', 'new-1']);
});

it.each([
  [['a', 'b'], ['a', 'a']],
  [['a', 'b'], ['a']],
  [['a', 'b'], ['a', 'b', 'foreign']],
])('rejects a replacement that is not an exact queue permutation', (currentIds, submittedIds) => {
  expect(() => validateQueueReplacement(
    currentIds.map((request_id) => ({ request_id, delivery_status: 'assigned', queue_order: null })),
    submittedIds,
  )).toThrow();
});

it.each(['in_progress', 'arrived', 'picked_up', 'arrived_at_pickup', 'arrived_at_dropoff'])(
  'keeps %s work ahead of unstarted tasks', (delivery_status) => {
  expect(() => validateQueueReplacement([
    { request_id: 'started', delivery_status, queue_order: 1 },
    { request_id: 'waiting', delivery_status: 'assigned', queue_order: 2 },
  ], ['waiting', 'started'])).toThrow();
  },
);
```

- [ ] **Step 2: Run the focused test and verify it fails because the queue helpers do not exist**

Run from the repository root: `npx vitest run server/utils/__tests__/riderQueue.test.ts`.

Expected: FAIL on unresolved imports before implementation.

- [ ] **Step 3: Implement the pure queue helpers**

Implement exact-set validation with duplicate detection. `appendIncomingTasks` must reject duplicate IDs across existing and incoming work and require `incomingOrder` to be an exact permutation of `incomingIds`. `validateQueueReplacement` must require submitted IDs to exactly match the current queue and preserve the relative order of started tasks (`in_progress`, `arrived`, `picked_up`, `arrived_at_pickup`, `arrived_at_dropoff`) before every task that has not started.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run server/utils/__tests__/riderQueue.test.ts`.

Expected: all queue invariant cases PASS.

- [ ] **Step 5: Commit the queue invariant unit**

```bash
git add server/utils/riderQueue.ts server/utils/__tests__/riderQueue.test.ts
git commit -m "test: define rider queue ordering rules"
```

### Task 2: Add transaction-safe rider queue persistence

**Files:**
- Create: `server/services/riderTaskQueue.ts`
- Test: `server/services/__tests__/riderTaskQueue.test.ts`
- Use: `server/utils/riderQueue.ts`

**Interfaces:**
- `appendRequestsToRiderQueue(connection, riderId, requestIds, incomingOrder?)` appends newly assigned requests and persists contiguous 1-based ranks.
- `replaceRiderQueueOrder(connection, riderId, submittedIds)` validates and persists a full active queue order.
- `lockRiderQueues(connection, riderIds)` locks all affected rider rows in sorted ID order before queue membership changes.
- `normalizeRiderQueueOrder(connection, riderId)` compacts a source queue after a reassignment.
- Both functions run inside the caller's transaction and never commit or publish notifications.

- [ ] **Step 1: Write failing service tests for queue locking and ordered writes**

Mock a connection with `query`, then assert `lockRiderQueues` locks multiple rider IDs in sorted order and `appendRequestsToRiderQueue` reads active tasks only after the lock, includes approved assigned and in-progress rows regardless of delivery date, excludes terminal statuses, ignores incoming IDs already visible in the transaction, and writes `queue_order` 1 through N for the merged queue. Add failure cases for unknown incoming IDs, a missing rider, and a persistence error; assert the service throws so the route can roll back. Add a deferred-lock test proving a second append does not read the queue until the first append releases the rider lock.

Example fixture and rank assertion:

```ts
const existing = [
  { request_id: 'active-1', delivery_status: 'in_progress', queue_order: 1 },
  { request_id: 'overdue-1', delivery_status: 'assigned', queue_order: 2 },
];
// With incoming ['new-1'], assert writes are active-1 => 1, overdue-1 => 2, new-1 => 3.
```

- [ ] **Step 2: Run the focused service test and verify it fails**

Run: `npx vitest run server/services/__tests__/riderTaskQueue.test.ts`.

Expected: FAIL because the service module and functions are not implemented.

- [ ] **Step 3: Implement rider-scoped locking and authoritative queue loading**

Inside the existing route transaction, lock rider rows with `SELECT id FROM users WHERE id = ? FOR UPDATE` in sorted rider-ID order, then load each rider's approved, nonterminal assigned tasks using `FOR UPDATE`, ordered by current `queue_order` with deterministic `delivery_date`, `created_at`, and `request_id` tie-breakers. Include overdue work because overdue is a deadline state, not a terminal delivery status. Before appending, exclude the request IDs being added from the loaded queue; a transaction may already see its own assignment updates. Verify each incoming request belongs to this assignment operation and reject a row assigned to another rider unless the caller is performing an explicit reassignment.

Use `appendIncomingTasks` for append operations and `validateQueueReplacement` for full replacement. Persist the full sequence as contiguous ranks starting at 1. Before choosing the update order, inspect the `delivery_requests` table indexes; if `(assigned_rider_id, queue_order)` is unique, write temporary non-overlapping positive ranks before writing the final 1-based ranks. Otherwise write the final order directly. `normalizeRiderQueueOrder` loads the remaining active queue and writes its compacted ranks after a transfer.

- [ ] **Step 4: Run the service tests and verify they pass**

Run: `npx vitest run server/services/__tests__/riderTaskQueue.test.ts`.

Expected: lock order, inclusion/exclusion, exact ranks, and rollback signaling all PASS.

- [ ] **Step 5: Commit the queue persistence unit**

```bash
git add server/services/riderTaskQueue.ts server/services/__tests__/riderTaskQueue.test.ts
git commit -m "feat: persist rider task queues transactionally"
```

### Task 3: Route all assignment and route edits through the queue service

**Files:**
- Modify: `server/routes/requests.ts` (`PUT /:id/approve`, `POST /mass-update`, `POST /resequence`)
- Create: `server/routes/__tests__/request-assignment-queue.test.ts`
- Use: `server/services/riderTaskQueue.ts`

**Interfaces:**
- Direct approval appends exactly one request and returns its persisted `queue_order`.
- Batch approval appends the selected requests in the submitted batch order after existing work.
- Reassignment removes the request from the old rider's queue and appends it to the new rider's queue in the same transaction.
- Resequence accepts a full active queue and rejects stale or invalid sequences with HTTP 409 and code `QUEUE_CHANGED`.

- [ ] **Step 1: Add failing route tests for direct append, batch append, and stale reorder**

Use Express + Supertest + Vitest mocks, following `server/routes/__tests__/users-duty.test.ts`. Mock `pool.getConnection`, and configure query results per SQL statement. Assert direct approval of a rider with two active tasks writes rank 3; a second direct approval writes rank 4; batch approval preserves existing ranks and appends the posted batch order; and `/resequence` with a missing/foreign ID returns 409, rolls back, and emits no success notification.

- [ ] **Step 2: Run the focused route test and verify it fails**

Run: `npx vitest run server/routes/__tests__/request-assignment-queue.test.ts`.

Expected: FAIL because the direct-approval route does not yet persist queue order and the route test is new.

- [ ] **Step 3: Integrate queue writes into direct approval**

After validating the pending request and rider and before committing, call `appendRequestsToRiderQueue(connection, rider_id, [id])`. Keep assignment, queue rank, notification records, and audit-relevant values in the same transaction. Include the resulting rank in the success response and `request-updated` event if that event payload already carries queue metadata; otherwise refresh the existing request feed after commit.

- [ ] **Step 4: Integrate queue writes into batch approval and reassignment**

For `action === 'approve'`, append the approved `taskIds` in the validated submitted sequence. Do not overwrite or omit the rider's existing queue. For `action === 'reassign'`, read the current assigned rider IDs, lock all source and target rider rows in sorted ID order, lock and revalidate the request rows, update assignments, normalize each source queue, and append moved requests to the target queue before commit. Preserve existing push, requester, rider, admin notifications, and movement events.

- [ ] **Step 5: Validate full queue replacement in `/resequence`**

Replace the current loop that updates only submitted IDs with `replaceRiderQueueOrder`. Return 409 `QUEUE_CHANGED` for a stale queue; rollback before returning. Continue writing the movement event and publishing rider/admin updates only after successful commit.

- [ ] **Step 6: Run focused server tests**

Run: `npx vitest run server/routes/__tests__/request-assignment-queue.test.ts server/services/__tests__/riderTaskQueue.test.ts server/utils/__tests__/riderQueue.test.ts`.

Expected: all route, service, and utility tests PASS; verify rollback and no success events on every rejected mutation.

- [ ] **Step 7: Commit the route integration**

```bash
git add server/routes/requests.ts server/routes/__tests__/request-assignment-queue.test.ts
git commit -m "fix: keep assignment and rider queue order atomic"
```

### Task 4: Make assignment and route review a single-choice workflow

**Files:**
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Modify: `src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx`
- Modify: `src/app/components/Admin/EnhancedBatchApproveModal.tsx`
- Modify: `src/app/context/DataContext.tsx`
- Test: `src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx`

**Interfaces:**
- Single approval invokes the direct approval endpoint once; it does not open The Interceptor.
- Route review is launched only by Manage Route and receives a fixed `riderId`.
- Batch approval keeps its one rider selector and submits only the new batch order.
- Failed direct approval rejects to the caller so the details panel cannot show a success toast for a failed request.

- [ ] **Step 1: Write failing UI tests for direct assignment and fixed-rider route review**

Render the relevant modal/panel with two riders. Verify a single assignment for a selected rider calls the direct approval handler without rendering the route-review modal. Verify Manage Route renders the current rider as fixed and does not show the second rider picker. Verify batch assignment still permits one rider selection and submits its selected task order.

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx`.

Expected: FAIL on the current single-assignment interceptor branch and duplicate rider selector.

- [ ] **Step 3: Remove automatic single-assignment interception**

In `DispatchConsole.tsx`, have `onApprove` call the direct approval handler regardless of current workload. Remove `mode: 'approve'` from `interceptData`; keep only the Manage Route flow. Preserve the selected rider from `RequestDetailsPanel` and do not present another rider choice for a single assignment.

- [ ] **Step 4: Give route review a fixed rider and clearer purpose**

Add an explicit modal mode such as `'batch-assign' | 'route-review'` to `EnhancedBatchApproveModal`. In `route-review`, accept `riderId`, hide the rider picker, show the rider name as context, and call `POST /api/requests/resequence` with the full displayed queue. In `batch-assign`, retain the existing one-time rider picker and pass the order of selected new tasks to `POST /api/requests/mass-update`. Use action labels `Save route order` and `Assign tasks` respectively; retain cancel and submitting states.

- [ ] **Step 5: Make failed approval observable to the UI**

Update `DataContext.approveRequest` to rethrow after restoring optimistic state when the response is absent or non-OK. Keep rollback of the optimistic request state. The panel should show success only after the promise resolves and show the existing failure toast on rejection.

- [ ] **Step 6: Run focused UI tests and verify they pass**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx src/app/components/Admin/Dispatch/__tests__/read-only-details.test.tsx`.

Expected: single assign has one rider choice, route review has a fixed rider, batch assignment retains its selector, and request failure never shows success.

- [ ] **Step 7: Commit the single-choice UI flow**

```bash
git add src/app/pages/Admin/DispatchConsole.tsx src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx src/app/components/Admin/EnhancedBatchApproveModal.tsx src/app/context/DataContext.tsx src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx
git commit -m "refactor: simplify dispatch rider assignment flow"
```

### Task 5: Align Active and Overdue queue ranks and sort order

**Files:**
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Modify: `src/app/components/Admin/Dispatch/RequestCard.tsx`
- Modify: `src/app/components/Admin/Dispatch/RequestList.tsx`
- Test: `src/app/pages/Admin/__tests__/dispatch-queue-order.test.tsx`

**Interfaces:**
- Active and Overdue cards render the persisted `queue_order` for the task's assigned rider.
- With sequence sorting selected, both lists sort by rider then `queue_order`; terminal tasks never appear in active queue ranking.

- [ ] **Step 1: Write failing sort and rank-scope tests**

Use tasks for rider A with queue orders 1 and 2 and rider B with queue order 1. Verify Active and Overdue sequence sorting groups by rider and sorts by order within each rider; verify each rider may have a rank 1; verify the card exposes the assigned rider alongside the rank so rank scope is clear.

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run: `npx vitest run src/app/pages/Admin/__tests__/dispatch-queue-order.test.tsx`.

Expected: FAIL because Active's `sequence` sort currently falls through without ordering by `queue_order`, and Overdue sorts only by overdue duration.

- [ ] **Step 3: Use a shared deterministic rider-queue comparator**

Add a small comparator in `DispatchConsole.tsx` or a focused `src/app/utils/dispatchQueue.ts` utility. For Active and Overdue when sequence sorting is selected, compare `assigned_rider_id`, then positive `queue_order`, then `delivery_date`, `created_at`, and `request_id` as deterministic tie-breakers. Preserve explicit alternate urgency/age sorting only when the admin chooses it.

- [ ] **Step 4: Make rank scope explicit in card presentation**

Keep the existing rank indicator, and ensure the card's assigned rider name is visible in the same card. Add an accessible label to the rank indicator in the form `Queue position {queue_order} for {assigned_rider_name}`; do not treat queue rank as globally unique across riders.

- [ ] **Step 5: Run the focused UI test and verify it passes**

Run: `npx vitest run src/app/pages/Admin/__tests__/dispatch-queue-order.test.tsx src/app/components/Admin/Dispatch/__tests__/request-ledger-visibility.test.tsx`.

Expected: Active/Overdue sorting is deterministic and rank labels are understandable for multiple rider queues.

- [ ] **Step 6: Commit the queue display alignment**

```bash
git add src/app/pages/Admin/DispatchConsole.tsx src/app/components/Admin/Dispatch/RequestCard.tsx src/app/components/Admin/Dispatch/RequestList.tsx src/app/pages/Admin/__tests__/dispatch-queue-order.test.tsx
git commit -m "fix: align dispatch views with rider queue order"
```

### Task 6: Run full applicable checks and refresh graphify

**Files:**
- Verify: backend, web admin, and `graphify-out/`

- [ ] **Step 1: Run lint and type checks where configured**

Check package scripts first. The root `package.json` currently has no `lint`, `typecheck`, or `test` script; do not invent scripts or install packages. Run the existing lint/type checks for touched packages if present, otherwise record the missing stage and proceed with supported checks.

- [ ] **Step 2: Run the relevant server and web test suites**

Run: `npx vitest run server/utils/__tests__/riderQueue.test.ts server/services/__tests__/riderTaskQueue.test.ts server/routes/__tests__/request-assignment-queue.test.ts src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx src/app/components/Admin/Dispatch/__tests__/read-only-details.test.tsx src/app/pages/Admin/__tests__/dispatch-queue-order.test.tsx src/app/components/Admin/Dispatch/__tests__/request-ledger-visibility.test.tsx`.

Expected: all listed tests PASS.

- [ ] **Step 3: Build frontend and backend**

Run: `npm run build`.

Expected: Vite frontend build and `server` TypeScript build both exit successfully. Report existing warnings separately.

- [ ] **Step 4: Refresh graphify**

Run: `graphify update .` and confirm it exits successfully. If the tool stalls after AST extraction, report that the graph refresh did not complete; do not claim graphify is current.

- [ ] **Step 5: Review the complete diff and confirm acceptance criteria**

Check `git diff --check`, inspect the queue service and all three assignment/resequence routes, and confirm there are no unintentional edits to already-dirty files. Verify each acceptance criterion in the spec against a test or a route/UI behavior.

- [ ] **Step 6: Commit the completed queue workflow**

```bash
git add server src/app docs/superpowers/specs/2026-10-08-lean-dispatch-assignment-queue-design.md docs/superpowers/plans/2026-10-08-lean-dispatch-assignment-queue.md
git commit -m "feat: unify dispatch assignment and rider queues"
```
