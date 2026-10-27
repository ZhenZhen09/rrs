# Shift Flow Edge Case Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep attendance status, current shift sessions, and the rider app’s duty state consistent when a rider changes attendance, after legacy backfill, and when local mobile persistence fails after a server response.

**Architecture:** Route non-present attendance changes through a transaction that locks the rider and refuses to change attendance while an active session is open. Distinguish historical legacy sessions whose end time is unknown from genuinely open sessions, so no historical row blocks a new shift and no end time is invented. On mobile, treat a successful server response as authoritative, apply the server state, and only then clear the retry operation ID; cache failures must not turn a committed server transition into a reported failure.

**Tech Stack:** TypeScript, Express, MySQL (`mysql2/promise`), React Native/Expo, AsyncStorage, Vitest, Jest.

**Design reference:** `docs/superpowers/specs/2026-10-05-multiple-rider-shift-sessions-design.md`

## Constraints and behavior decisions

- A rider cannot mark absent or on leave while a shift is open. The API returns `409 OPEN_SHIFT`; it does not change the attendance row, duty flag, tasks, or session. The rider must end the shift through the normal flow, including handover when active tasks remain.
- A historical attendance record with a check-in but no recorded off-duty time has an unknown end. Do not fabricate a timestamp or count guessed hours. Store it as a legacy session with unknown end that is not considered the rider’s active session.
- A same-day legacy row without an end may be considered active only when the rider’s persisted `is_on_duty` flag is true. Other null-ended legacy rows are unknown/closed for active-session purposes.
- A successful duty API response is the commit point. Update in-memory state from its response, persist cache best-effort, and clear the matching pending operation ID last. Local cache errors after a server success do not report the operation as failed.
- Keep current API authorization and active-task assignment behavior. Do not reassign or cancel tasks.
- Preserve existing unrelated workspace changes.

## Review focus

- Absent/on-leave requests cannot make an open session appear off duty; the response is a clear conflict and all writes are rolled back.
- An active legacy open record for a past date is never returned as the current session or used to reject today’s start.
- A legacy record with unknown end remains visible but has no fabricated duration.
- If AsyncStorage fails after the server has committed, mobile UI reflects the server response and the pending operation ID is not prematurely discarded.
- Retrying after the response-loss case returns the original start/end result without creating another session or movement event.

## File structure

- Modify `scripts/migrate-shift-sessions.cjs`: backfill explicit session state for known-ended, current-active, and historical-unknown legacy rows; include classifications in dry-run output.
- Modify `server/services/shiftSessions.ts`: query only explicitly open sessions; add a transaction-backed daily attendance update for absent/on-leave that rejects when an open session exists; return existing session status consistently.
- Modify `server/routes/users.ts`: route absent/on-leave attendance changes through the transaction service and translate `OPEN_SHIFT` to HTTP 409; ensure only a committed transition emits notifications.
- Modify `mobile-app/context/LocationContext.tsx`: synchronize duty state from the server response, apply UI state before clearing its operation ID, and make local cache writes nonfatal after a committed transition.
- Modify `server/services/__tests__/shiftSessions.test.ts` and `server/routes/__tests__/users-duty.test.ts`: test historical-unknown versus current-open legacy state, transaction rollback on attendance conflict, and no write when a session is open.
- Modify `mobile-app/services/__tests__/shiftOperationService.test.ts` or add a focused `LocationContext` test: simulate local cache failure after a successful response and verify the UI result and operation-ID retention/replay behavior.
- Modify `src/app/pages/Admin/AttendanceDashboard.tsx` and `src/app/pages/Admin/__tests__/attendance-sessions.test.tsx`: show unknown-end legacy sessions as `End time unknown` and exclude them from completed work totals.
- Modify `docs/superpowers/specs/2026-10-05-multiple-rider-shift-sessions-design.md`: document the explicit session state and historical unknown-end behavior.

## Implementation tasks

### Task 1: Make attendance status transitions respect open sessions

- [ ] Add a failing service test for `setNonPresentAttendance` when the rider has an open session; expect `OPEN_SHIFT`, rollback, and no attendance/user updates.
- [ ] Add a failing route test for `POST /:id/attendance` with `absent` while a shift is open; expect HTTP 409 with `code: OPEN_SHIFT` and no socket event.
- [ ] Implement `setNonPresentAttendance(db, { riderId, status, reason })` in `server/services/shiftSessions.ts`: begin a transaction, lock the rider row `FOR UPDATE`, check for session state `open`, reject with typed `OPEN_SHIFT` when present, otherwise upsert daily attendance and set `users.is_on_duty = FALSE`, then commit.
- [ ] Replace direct absent/on-leave attendance SQL in `server/routes/users.ts` with the new transaction service. Emit attendance/admin events only after the service resolves.
- [ ] Run the focused server service and route tests; verify the rejected path writes nothing and releases its connection.

### Task 2: Distinguish genuinely open sessions from unknown historical ends

- [ ] Add failing migration/service tests for a prior-day null-ended attendance row, a same-day null-ended row with rider on duty, and a same-day null-ended row with rider off duty.
- [ ] Extend `shift_sessions` with a `session_state` enum (`open`, `closed`, `legacy_unknown`), with new rider-created sessions starting `open` and ended sessions becoming `closed` in the existing transaction.
- [ ] Backfill legacy rows with recorded `off_duty_time` as `closed`; classify a same-day null-ended row as `open` only when `users.is_on_duty = TRUE`; classify other null-ended legacy rows as `legacy_unknown`. Preserve `end_time = NULL` for unknown records.
- [ ] Make migration reruns safe when the table already exists: inspect/add `session_state` without losing existing rows; set existing non-null-ended rows to `closed`, and classify legacy null-ended rows using the same rider/date rule.
- [ ] Extend dry-run output with counts for proposed, already backfilled, currently open, closed, and legacy unknown rows; do not mutate on dry-run.
- [ ] Change all current-session/open-session lookups and transition queries to use `session_state = 'open'`; update closing SQL to set both `end_time` and `session_state = 'closed'` atomically.
- [ ] Update the web admin session list to display `End time unknown` for `legacy_unknown` records and exclude them from totals.
- [ ] Run migration helper, service, focused admin tests, and server typecheck.

### Task 3: Preserve mobile retry state after committed responses

- [ ] Add a failing test where server duty update succeeds but writing `@is_on_duty` fails; verify the call reports success and the UI duty state matches the response.
- [ ] Reorder `toggleDuty`: await server result; immediately apply `response.data.is_on_duty` to React state; attempt duty cache write without converting cache failure into API failure; clear the matching operation ID last.
- [ ] Apply the same committed-response handling to present attendance check-in, keeping attendance and duty cache writes best-effort after the server confirms.
- [ ] Keep a pending ID when storage clearing fails; replaying that ID must remain safe because server operation receipts are idempotent.
- [ ] Run the new mobile retry test, mobile typecheck, lint, and complete mobile test suite.

### Task 4: Full verification and documentation

- [ ] Update the design spec with `session_state` and legacy unknown-end semantics.
- [ ] Run checks in order: mobile lint; mobile/server typechecks; focused server/admin/mobile tests; full mobile and root tests; then builds/Expo export only if earlier stages pass.
- [ ] Stop on a failing quality stage, fix the issue, and rerun the sequence from lint. Report unrelated existing failures by test/file.
- [ ] Run `graphify update .` after code changes.
- [ ] Review the final diff to confirm unknown ends do not count as work time, non-present attendance cannot bypass shift end, and no task assignment changes were made.

## Operational note

The existing migration has not been run in the target database. Before applying the updated migration, run `node scripts/migrate-shift-sessions.cjs --dry-run` and inspect the classification counts. Apply the migration with `node scripts/migrate-shift-sessions.cjs` only after the counts and target database are confirmed.
