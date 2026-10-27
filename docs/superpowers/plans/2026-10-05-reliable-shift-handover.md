# Reliable Rider Shift End With Task Handover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure a rider can end a shift with active tasks only by providing a handover reason, while keeping those tasks assigned and making the handover and shift end visible to admins.

**Architecture:** Keep task ownership unchanged when the rider goes off duty. The mobile app submits the handover reason through the existing duty endpoint; the server checks current active tasks and atomically records off-duty status, end time, and a duty-off event with the reason. The client only closes the confirmation flow after server success, and the admin attendance page presents the handover reason and remaining task count clearly.

**Tech Stack:** TypeScript, Express, MySQL, React Native/Expo, React, Vitest, existing Socket.IO notifications.

**Spec:** Agreed flow in the conversation: active tasks remain assigned; rider must provide a reason to hand them over; admins are notified and can coordinate reassignment; without a reason the rider stays on duty; failed persistence must not report a successful shift end.

## Global Constraints

- Preserve existing task assignments during shift end; do not silently unassign, cancel, or reassign tasks.
- Keep existing rider authorization and ownership checks on `POST /api/users/:id/duty`.
- Continue blocking shift end with active tasks unless a non-empty handover reason is submitted.
- Use the project's Philippine-local day/time SQL helpers for attendance records.
- Keep the response contract compatible with `updateDutyStatus(userId, is_on_duty, reason?)` unless a necessary response field is added.
- Follow the repository's existing TypeScript, API, and UI conventions; add no dependencies.

## Review Focus

- A client with stale task data cannot bypass the server-side active-task check; verify the API still rejects off-duty without a reason when active tasks exist.
- Whitespace-only reasons are rejected as missing; verify the rider remains on duty and no end timestamp is written.
- A database failure while saving the shift-end record does not leave duty status and attendance time inconsistent; verify transaction rollback.
- A failed API response does not close the mobile confirmation UI; verify it remains available for retry.
- A successful handover does not alter task assignment and is visible to an admin with a reason and active-task count; verify DB state and rendered admin data.

---

## File Structure

- Modify `server/routes/users.ts`: validate handover reason, perform atomic off-duty/attendance/event persistence, preserve task assignment, and emit admin updates only after commit.
- Create `server/routes/__tests__/users-duty.test.ts`: route-level tests for authorized duty-on/off, missing reason, successful handover, and persistence failures.
- Modify `mobile-app/context/LocationContext.tsx`: preserve the duty toggle result and make successful/failed state transitions explicit.
- Modify `mobile-app/app/(tabs)/index.tsx`: retain the shift-end prompt on failure and close it only on success.
- Modify `mobile-app/components/ShiftEndModal.tsx`: delegate closing to the caller after confirmed success; prevent duplicate submits while pending.
- Add or update mobile tests under `mobile-app/components/__tests__/` or `mobile-app/app/(tabs)/__tests__/`: exercise success and failure close behavior using the existing test setup.
- Modify `src/app/pages/Admin/AttendanceDashboard.tsx`: show handover reason and remaining active tasks as an explicit handover entry for an ended shift with tasks.
- Create `src/app/pages/Admin/__tests__/attendance-handover.test.tsx`: assert handover note/task count display and ordinary shift display.

## Implementation Tasks

### Task 1: Lock down the server-side handover rules

**Files:**
- Modify: `server/routes/users.ts`
- Create: `server/routes/__tests__/users-duty.test.ts`

**Interfaces:**
- Consumes: Existing `POST /:id/duty` request `{ is_on_duty: boolean, reason?: string }`.
- Produces: Off-duty requests with active tasks require a trimmed, non-empty reason; successful handover leaves task rows assigned and records the reason on the duty-off movement event.

- [ ] Write route tests for off-duty with active tasks and no reason, whitespace-only reason, valid reason, and off-duty with no tasks.
- [ ] Run `npx vitest run server/routes/__tests__/users-duty.test.ts` and confirm the new behavior tests fail for the missing/incorrect behavior.
- [ ] Update route validation to trim the reason and return HTTP 400 when active tasks exist and the trimmed reason is empty.
- [ ] On valid handover, retain task assignments and store the exact trimmed reason in movement event metadata (`handover_reason`).
- [ ] Emit admin warning and rider/admin duty status updates only after persistence succeeds.
- [ ] Run `npx vitest run server/routes/__tests__/users-duty.test.ts` and confirm all route rule tests pass.

### Task 2: Make off-duty status and shift-end time atomic

**Files:**
- Modify: `server/routes/users.ts`
- Modify: `server/routes/__tests__/users-duty.test.ts`

**Interfaces:**
- Consumes: Task 1 validation and existing database pool.
- Produces: A successful off-duty response means both `users.is_on_duty = FALSE` and today's `attendance_logs.off_duty_time` were committed; failures return an error without partially ending the shift.

- [ ] Add tests that simulate failure when saving attendance and when saving the movement event; assert duty status remains on and no partial shift-end timestamp is returned as success.
- [ ] Wrap the off-duty status update, attendance end-time update, and handover movement-event insert in one database transaction.
- [ ] If today's attendance row is missing, preserve the existing intended attendance behavior by ensuring an attendance row exists before setting its end time, or explicitly reject with a clear server error; choose and test the behavior consistent with the current failsafe design.
- [ ] Commit before emitting Socket.IO events; rollback and return HTTP 500 on any persistence error.
- [ ] Confirm active delivery task rows remain unchanged after a successful handover.
- [ ] Run `npx vitest run server/routes/__tests__/users-duty.test.ts`.

### Task 3: Keep the mobile shift-end prompt open on failure

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx`
- Modify: `mobile-app/app/(tabs)/index.tsx`
- Modify: `mobile-app/components/ShiftEndModal.tsx`
- Add or modify: mobile shift-end component/screen test under `mobile-app/components/__tests__/` or `mobile-app/app/(tabs)/__tests__/`

**Interfaces:**
- Consumes: `toggleDuty(status, reason?)` returns `Promise<boolean>`.
- Produces: Shift-end UI closes only when `toggleDuty(false, reason?)` resolves `true`; on rejection the app retains the prompt and the rider remains on duty locally.

- [ ] Add a mobile test where the duty API rejects and assert the dialog remains open and loading ends.
- [ ] Add a mobile test where the duty API succeeds and assert the dialog closes and the state becomes off duty.
- [ ] Update `handleShiftEndConfirm` to return the boolean result from `toggleDuty` and close only on success.
- [ ] Update `ShiftEndModal` to close only when `onConfirm` succeeds; ensure cancel remains available only when not submitting.
- [ ] Keep the handover modal open when the request fails; close it only after successful server confirmation.
- [ ] Run the focused mobile test command available in `mobile-app/package.json` for the added test file.

### Task 4: Make handover explicit in the rider flow

**Files:**
- Modify: `mobile-app/app/(tabs)/index.tsx`
- Modify: `mobile-app/components/HandoverModal.tsx`
- Add or modify: mobile handover tests from Task 3

**Interfaces:**
- Consumes: Server rule from Task 1 and boolean duty result from Task 3.
- Produces: A rider with active tasks sees a clear explanation that tasks stay assigned for admin coordination, must enter a reason, and sees server errors without losing the entered reason.

- [ ] Inspect the existing handover modal and retain its reason-entry UI; add concise copy that the rider's active tasks remain assigned and the admin will coordinate reassignment.
- [ ] On missing/blank reason, keep the rider on duty and show the validation message without calling the server when the client can detect it.
- [ ] On server rejection, preserve the entered reason for correction/retry and keep the modal open.
- [ ] On success, close the modal and refresh task/duty state from the server.
- [ ] Run the focused mobile test file(s).

### Task 5: Show handover details in web admin attendance

**Files:**
- Modify: `src/app/pages/Admin/AttendanceDashboard.tsx`
- Create: `src/app/pages/Admin/__tests__/attendance-handover.test.tsx`

**Interfaces:**
- Consumes: Existing attendance response fields `off_duty_time`, `active_task_count`, and `handover_reason` from `GET /api/users/attendance/daily`.
- Produces: Admin can tell that a rider ended duty with unfinished tasks, read the recorded reason, and see how many tasks remain assigned.

- [ ] Add a UI test for a present rider with an end time, positive active task count, and handover reason.
- [ ] Render an explicit handover label, the reason, and a remaining-task count when `off_duty_time` exists and `active_task_count > 0`.
- [ ] Keep ordinary completed shift and no-handover records visually unchanged.
- [ ] Run `npx vitest run src/app/pages/Admin/__tests__/attendance-handover.test.tsx`.

### Task 6: Verify the end-to-end behavior and repository quality gates

**Files:**
- Review: changes from Tasks 1–5
- Modify: tests only if verification reveals a regression

**Interfaces:**
- Consumes: Full server, mobile, and admin implementation.
- Produces: Verified behavior across persistence, rider interaction, and admin visibility.

- [ ] Run focused server, mobile, and web tests for the files changed above.
- [ ] Run the repository quality gate in the required order: lint, typecheck, test, then build; stop on the first failure, fix it, and rerun the full sequence.
- [ ] Run `graphify update .` after code changes to refresh the project graph.
- [ ] Review the final diff to confirm no task assignment mutation or unrelated UI changes were introduced.
