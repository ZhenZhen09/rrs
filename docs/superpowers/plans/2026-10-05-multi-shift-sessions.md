# Multiple Rider Shift Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record each rider start/end cycle as its own retry-safe session and show accurate session durations and daily totals in the admin view.

**Architecture:** Add a `shift_sessions` table while retaining `attendance_logs` as the daily present/absent/on-leave source. A server session service owns all transitions; it locks the rider row, enforces one open session, persists an idempotency key, checks handover rules, and commits rider duty state with the session. Both morning attendance check-in and later duty toggles use the same start/close operations. Mobile stores request IDs until the server confirms, and the admin loads session rows and totals instead of deriving work duration from the one-row-per-day attendance timestamps.

**Tech Stack:** TypeScript, Express, MySQL (`mysql2/promise`), React Native/Expo, React, Vitest, Jest, AsyncStorage, existing Socket.IO updates.

**Spec:** `docs/superpowers/specs/2026-10-05-multiple-rider-shift-sessions-design.md`

## Global Constraints

- Use Asia/Manila date and timestamp rules already defined in `server/routes/users.ts`.
- Keep `attendance_logs.status` as the source for present/absent/on-leave availability used by dispatch and rider access.
- A rider may have at most one open shift session; enforce this in a transaction while locking that rider's `users` row.
- Do not unassign, cancel, or reassign unfinished delivery tasks as part of shift end.
- Repeated requests with the same operation ID return the original result without changing session times or duplicating events.
- Keep existing API authorization: riders may only change/read their own sessions; admin attendance remains admin-only.
- Make the migration repeatable and safe for existing databases; do not add dependencies.
- Preserve unrelated dirty workspace changes and do not commit or reset them.

## Review Focus

- Existing present attendance with no open session creates exactly one session; test `POST /:id/attendance` with status `present`.
- Repeated/concurrent starts cannot create two open sessions; test same operation replay and two start calls against the same rider lock.
- Repeated end with the same operation ID does not replace the first end timestamp; test a response-loss retry.
- A different end attempt when no session is open returns a conflict and does not create an extra duty-off event; test duplicate-tap behavior.
- A session ending with active tasks requires a trimmed reason, records the task count/reason, and leaves delivery rows unchanged; test blank reason, valid reason, and persistence rollback.
- A daily total excludes gaps and open-session time; test two closed sessions plus one open session.
- Legacy attendance rows become one historical session only once; test migration idempotency with a stable source attendance ID.

---

## File Structure

- Create `scripts/migrate-shift-sessions.cjs`: create the session table and idempotently backfill legacy attendance rows.
- Create `server/services/shiftSessions.ts`: transaction-backed session start, end, current-session lookup, idempotency, and date-summary helpers.
- Create `server/services/__tests__/shiftSessions.test.ts`: session service tests using a mocked MySQL pool/connection.
- Modify `server/routes/users.ts`: route morning `present` check-in and on/off duty transitions through the session service; add rider current-session lookup; return typed handover/idempotency responses; close sessions in the dev auto-sweep.
- Modify `server/routes/__tests__/users-duty.test.ts`: cover first start, repeat sessions, task handover, retries, invalid transitions, and rollbacks.
- Modify `mobile-app/services/apiService.ts`: include `operation_id` in duty requests and add current-session fetch.
- Create `mobile-app/services/shiftOperationService.ts`: generate, persist, retrieve, and clear pending operation IDs in AsyncStorage.
- Create `mobile-app/services/__tests__/shiftOperationService.test.ts`: verify operation IDs remain stable until cleared and new actions receive new IDs.
- Modify `mobile-app/context/LocationContext.tsx`: synchronize duty/session state from the server and use the pending operation ID for every start/end attempt.
- Modify `mobile-app/app/(tabs)/index.tsx`, `mobile-app/components/ShiftEndModal.tsx`, and `mobile-app/components/HandoverModal.tsx`: preserve the current retry UI and start a new session only after server success.
- Modify `server/routes/users.ts` admin daily attendance handler and `src/app/pages/Admin/AttendanceDashboard.tsx`: return/render per-rider sessions, in-progress state, handover details, and total closed session time.
- Create `src/app/pages/Admin/__tests__/attendance-sessions.test.tsx`: verify multiple sessions, a current open session, handover data, and daily totals.
- Modify `server/routes/analytics.ts`: use the earliest session start for the rider/date field currently sourced from `attendance_logs.check_in_time`; keep its existing output field for API compatibility.
- Update `server/routes/__tests__/users-duty.test.ts` or add `server/routes/__tests__/attendance-sessions.test.ts` for the admin endpoint and analytics query behavior.

## Implementation Tasks

### Task 1: Add the session table and legacy backfill

**Files:**
- Create: `scripts/migrate-shift-sessions.cjs`
- Create: `server/services/__tests__/shiftSessions.test.ts`

**Interfaces:**
- Consumes: Existing `attendance_logs(id, rider_id, date, status, check_in_time, off_duty_time)` rows and the existing MySQL configuration.
- Produces: `shift_sessions` rows with a stable legacy source ID, start/end timestamps, operation IDs, and handover fields; rerunning the migration does not duplicate backfilled sessions.

- [ ] Write a migration validation test/check that supplies two legacy rows, one with an end time and one open, and expects deterministic session IDs and copied timestamps.
- [ ] Run the focused migration/service test and confirm the missing session schema/backfill behavior fails.
- [ ] Create `shift_sessions` with a primary session ID, rider ID, start/end times, nullable start/end operation IDs, nullable handover reason/count, and a unique legacy attendance source ID.
- [ ] Add indexes for rider plus start time, rider plus start operation ID, and rider plus end operation ID; keep nullable operation IDs valid for migration rows.
- [ ] Backfill with `INSERT IGNORE` using a deterministic ID/source reference derived from `attendance_logs.id`.
- [ ] Add a dry-run/report option that prints proposed and existing/backfilled counts without mutating rows; the normal migration logs counts and closes its pool cleanly.
- [ ] Run the migration test and confirm duplicate execution leaves one legacy session per source row.

### Task 2: Build and test the transaction-backed shift session service

**Files:**
- Create: `server/services/shiftSessions.ts`
- Create/modify: `server/services/__tests__/shiftSessions.test.ts`

**Interfaces:**
- `startShiftSession(pool, { riderId, operationId })` returns the created/replayed/current-open session.
- `endShiftSession(pool, { riderId, operationId, reason })` returns the closed/replayed session and task count; it throws typed `HANDOVER_REQUIRED` or `NO_OPEN_SHIFT` errors before emitting notifications.
- `getCurrentShiftSession(pool, riderId)` returns the open session or `null`.
- `getShiftSessionSummary(pool, riderId, date)` returns ordered sessions and the sum of closed durations.

- [ ] Write failing tests for first start, same-operation replay, a second start while already open, same-day second session after end, and end with no open session.
- [ ] Write failing tests for active tasks with blank reason, valid handover metadata/count, unchanged task assignment, and failure at each required write causing rollback.
- [ ] Write a duration-summary test with 08:00–12:00, 13:00–17:00, and one open session; expect 8 completed hours and exclude the open session and break.
- [ ] Run `npx vitest run server/services/__tests__/shiftSessions.test.ts` and confirm the new behavior fails before implementation.
- [ ] Implement all state changes on one MySQL connection transaction: lock `users` row `FOR UPDATE`, check operation ID, find/create or close the open session, query active tasks for an end, update `users.is_on_duty`, update legacy attendance daily markers, and insert the movement event before commit.
- [ ] When closing with active tasks, trim and require a reason, persist the reason and `active_task_count_at_end`, and leave `delivery_requests` unchanged.
- [ ] On replay, return the stored session without replacing timestamps or inserting another movement event; on any write error, rollback and release the connection.
- [ ] Run `npx vitest run server/services/__tests__/shiftSessions.test.ts` and confirm all service tests pass.

### Task 3: Route every server duty transition through the service

**Files:**
- Modify: `server/routes/users.ts`
- Modify: `server/routes/__tests__/users-duty.test.ts`

**Interfaces:**
- Keep `POST /:id/attendance` for morning check-in; `status: 'present'` starts/returns a session using `operation_id`.
- Keep `POST /:id/duty` for later start/end; require `operation_id` for rider duty transitions and return `session`, `is_on_duty`, and typed conflict codes.
- Add `GET /me/shift-session` for the authenticated rider's open session/state.
- Admin daily attendance response includes ordered `sessions` and daily `total_worked_minutes` per rider.

- [ ] Add route tests proving present check-in creates a session and repeated present check-in with the same operation ID does not create another one.
- [ ] Add route tests for operation ID replay after a committed shift end, distinct start after close, and 409 when an end arrives without an open session.
- [ ] Add route tests for `HANDOVER_REQUIRED`, a valid reason, authorization/ownership, and no notification before commit.
- [ ] Run focused route tests and confirm expected failures.
- [ ] Replace direct duty/session SQL in attendance, duty, admin-daily, and dev auto-sweep handlers with the session service; ensure auto-sweep closes open sessions with a system-origin event.
- [ ] Emit Socket.IO duty/attendance notifications only after transaction commit and keep response fields backward-compatible where possible.
- [ ] Run focused route tests, including existing `npx vitest run server/routes/__tests__/users-duty.test.ts`.

### Task 4: Make mobile starts, ends, and retries use server session state

**Files:**
- Modify: `mobile-app/services/apiService.ts`
- Create: `mobile-app/services/shiftOperationService.ts`
- Create: `mobile-app/services/__tests__/shiftOperationService.test.ts`
- Modify: `mobile-app/context/LocationContext.tsx`
- Modify: `mobile-app/app/(tabs)/index.tsx`
- Modify: `mobile-app/components/ShiftEndModal.tsx`
- Modify: `mobile-app/components/HandoverModal.tsx`
- Modify: `mobile-app/components/__tests__/ShiftHandoverModal.test.tsx`

**Interfaces:**
- `updateDutyStatus(userId, isOnDuty, operationId, reason?)` sends one stable operation ID per pending action.
- `getMyShiftSession()` returns the server's current open session and duty state.
- `getOrCreateShiftOperationId(kind)` returns a persisted ID until `clearShiftOperationId(kind)` is called after a definitive response.

- [ ] Write failing tests showing pending operation IDs survive retries/restarts, clear only on success, and new operations receive a different ID after clear.
- [ ] Write/update modal tests for successful multi-session close, retry after network/server failure, and switching to handover on `HANDOVER_REQUIRED` from the simple end dialog.
- [ ] Run `cd mobile-app; npx jest services/__tests__/shiftOperationService.test.ts components/__tests__/ShiftHandoverModal.test.tsx --runInBand` and confirm new cases fail.
- [ ] Add the operation ID helper using Expo Crypto UUID generation and AsyncStorage persistence.
- [ ] Load session/duty state from `GET /me/shift-session` on startup and refresh; treat local state as cache only.
- [ ] Include stable operation IDs in first attendance check-in and later duty transitions; clear the matching ID after server success and retain it after failure.
- [ ] Keep shift/handover forms and typed reason available on failure; transition back to the start control only when the server confirms the previous session closed.
- [ ] Run the focused Jest tests and mobile `npx tsc --noEmit`.

### Task 5: Return and display session history in web admin

**Files:**
- Modify: `server/routes/users.ts`
- Modify: `src/app/pages/Admin/AttendanceDashboard.tsx`
- Create: `src/app/pages/Admin/__tests__/attendance-sessions.test.tsx`
- Create/modify: `server/routes/__tests__/attendance-sessions.test.ts`

**Interfaces:**
- Admin daily endpoint returns the existing rider attendance fields plus `sessions: ShiftSession[]` and `total_worked_minutes`.
- Each session includes ID, start/end, current/open state, duration minutes, handover reason, and task count at end.

- [ ] Write a UI test with two closed sessions and one open session; assert each start/end and handover is visible and the total includes only closed sessions.
- [ ] Write an endpoint test for ordering sessions by start time and reporting totals for the selected Philippine-local date.
- [ ] Run the focused admin/server tests and confirm they fail before the UI/API implementation.
- [ ] Render sessions under each rider with per-session duration and handover details; label an open session `In progress` and show total closed hours separately.
- [ ] Keep present/absent/on-leave status, conflict indicators, and historical single-session records available.
- [ ] Run `npx vitest run server/routes/__tests__/attendance-sessions.test.ts src/app/pages/Admin/__tests__/attendance-sessions.test.tsx`.

### Task 6: Update analytics and preserve legacy reporting

**Files:**
- Modify: `server/routes/analytics.ts`
- Add/modify: relevant analytics test in `tests/unit/analytics.test.ts` or a focused `server/routes/__tests__/attendance-sessions.test.ts`

**Interfaces:**
- Keep the weekly schedule API's `rider_time_in` field, but source it from the earliest session on the rider's delivery date.
- Daily worked-time totals come only from closed shift sessions.

- [ ] Add a test with two sessions on one delivery date and assert `rider_time_in` equals the first session start.
- [ ] Replace the weekly schedule join to `attendance_logs.check_in_time` with a grouped session lookup for the same rider and delivery date.
- [ ] Confirm historical backfilled sessions preserve existing `rider_time_in` values.
- [ ] Run the focused analytics test.

### Task 7: Run repository quality gates and refresh the graph

**Files:**
- Review: all files in Tasks 1–6
- Modify: only files implicated by a failing check

**Interfaces:**
- Consumes: Complete migration, server, mobile, analytics, and admin implementation.
- Produces: verified multi-session behavior, with remaining failures reported explicitly if caused by unrelated pre-existing workspace changes.

- [ ] Run applicable lint, typecheck, test, and build checks in the order required by the repository `AGENTS.md` and quality-gate skill; stop at a failure, fix it, then rerun from lint.
- [ ] Include the focused route/service tests, mobile test suite, admin/analytics tests, and available full package suites.
- [ ] Run `graphify update .` after code changes.
- [ ] Review the final diff to verify no delivery task assignment changes, no changes to unrelated dirty files, and no shift duration derived from legacy daily timestamps.
