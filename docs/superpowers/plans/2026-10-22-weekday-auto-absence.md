# Weekday Automatic Absence and Late Check-In Implementation Plan

> **For agentic workers:** Implement task-by-task from this plan. Preserve all existing worktree changes. Do not use an emulator.

**Goal:** Automatically mark riders absent 15 minutes after the configured weekday shift start when they have not checked in, and let an admin authorize a genuine late check-in without losing the audit trail.

**Architecture:** Extend the existing server shift worker with an idempotent weekday absence reconciliation using the effective shift schedule in `Asia/Manila`. Persist the automatic absence and administrator approval metadata on the daily attendance record, expose a protected approval action, and let the rider's normal check-in complete the transition to present-late. Surface the source and approval action in the admin attendance dashboard; attendance and duty remain separate states.

**Tech Stack:** TypeScript, Express, MySQL, React, React Native/Expo, Socket.IO, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-22-weekday-auto-absence-design.md`

## Global Constraints

- Evaluate weekdays only, using `Asia/Manila` dates and the effective configured shift start time.
- Use a 15-minute grace period.
- Exclude riders already checked in and riders with approved leave; never overwrite existing manual attendance.
- Approval authorizes check-in only; it does not itself set attendance present or duty on.
- Preserve the actual rider check-in time and automatic-absence/admin-approval audit data.
- Worker retries must be idempotent; use server authorization for admin approval and rider check-in.
- Do not test via emulator.
- Preserve unrelated worktree changes; do not stage or commit changes.

## Review Focus

- A worker firing repeatedly or running concurrently must not create duplicate automatic absences.
- At exactly the 15-minute boundary, absence eligibility must be consistent and use Philippine local time, including midnight/date transitions.
- Existing manual absent/on-leave/present rows must never be replaced by the worker.
- An admin must not approve a manual absence, another rider's row, or a date that has no eligible auto-absence.
- A late approval must not be enough to mark attendance present or place a rider on duty; only a successful rider check-in records the actual time.

---

### Task 1: Persist auto-absence and approval audit metadata

**Files:**
- Modify: `server/services/shiftSchedule.ts` — extend the existing idempotent schema setup invoked at server startup.
- Create: `server/scripts/2026-10-22-weekday-auto-absence.sql` — deployment migration for the same attendance columns.
- Test: `server/services/__tests__/shiftSchedule.test.ts` — schema setup is repeatable and adds only missing fields.

**Interfaces:**
- Add nullable attendance fields representing absence source, automatic absence timestamp, approving admin ID, and approval timestamp. Use stable names consistently across migration, queries, route payloads, and tests: `absence_source`, `auto_absent_at`, `late_checkin_approved_by`, and `late_checkin_approved_at`.
- `absence_source` distinguishes `manual` from `automatic_no_show`; existing rows default to `manual` or null and are not backfilled as automatic.

- [x] **Step 1: Add schema-setup tests** for fresh and partially migrated attendance schemas, asserting existing columns are detected and only missing columns are added.
- [x] **Step 2: Run the focused schema tests** with `npx vitest run server/services/__tests__/shiftSchedule.test.ts`; confirm the new cases fail before implementation.
- [x] **Step 3: Add the four nullable columns** to the startup schema ensure logic and create the deployment SQL with matching MySQL types and null-safe defaults.
- [x] **Step 4: Re-run the focused schema tests** and verify repeated ensure calls do not issue duplicate ALTER statements.

### Task 2: Reconcile eligible weekday no-shows

**Files:**
- Modify: `server/services/shiftCutoff.ts` — add auto-absence reconciliation and invoke it from the existing minute worker.
- Modify: `server/services/__tests__/shiftCutoff.test.ts` — cover deadline rules, exclusions, and idempotence.

**Interfaces:**
- Add a testable exported reconciliation function accepting the DB adapter and an injectable `now: Date`, following the existing `reconcileDueCutoffs(db, now)` pattern.
- Resolve the effective schedule with `getScheduleForDate`; calculate the deadline as scheduled start plus 15 minutes in `Asia/Manila`.
- Persist an absent row with source `automatic_no_show` and `auto_absent_at` equal to the scheduled deadline, only when no attendance row already exists for that rider/date.

- [x] **Step 1: Add failing tests** for before-start, at-start, before grace expiry, exactly at expiry, after expiry, Saturday/Sunday, approved leave, prior check-in, existing manual absence, no schedule, and repeat worker invocation.
- [x] **Step 2: Run the focused cutoff suite** with `npx vitest run server/services/__tests__/shiftCutoff.test.ts`; verify the new cases fail.
- [x] **Step 3: Implement due-date selection and transactional row creation.** Select riders, use Philippine date and schedule helpers, skip weekends and any existing attendance row, lock each rider/date decision, and use the existing rider/date uniqueness so simultaneous worker instances cannot duplicate or overwrite attendance.
- [x] **Step 4: Invoke absence reconciliation from `startShiftCutoffWorker`**, which is already started by `server/index.ts`, without changing scheduled shift-end behavior; ensure worker errors for one rider do not prevent reconciliation for others.
- [x] **Step 5: Re-run the cutoff suite** and verify all specified boundary and idempotence cases pass.

### Task 3: Admin approval and rider late check-in transition

**Files:**
- Modify: `server/routes/users.ts` — expose admin approval, include audit data in daily attendance, and emit confirmed updates.
- Modify: `server/services/shiftSessions.ts` — allow start/check-in only for an auto-absence with an admin approval; preserve original no-show metadata.
- Modify: `server/services/__tests__/shiftSessions.test.ts` — test transactional state transitions.
- Modify: `server/routes/__tests__/attendance-daily.test.ts` — test access control, route outcomes, and attendance metadata.
- Modify: `server/routes/__tests__/attendance-daily.test.ts` — assert source and approval fields are returned.

**Interfaces:**
- Add an administrator-only endpoint `POST /api/users/attendance/:riderId/late-check-in-approval` with `{ date: "YYYY-MM-DD" }`; permit only today's Philippine work date, and return approval metadata.
- Permit approval only for a row on that date whose status is absent and whose source is `automatic_no_show`. Record authenticated admin ID and server timestamp transactionally.
- On the rider's subsequent ordinary present/check-in request, require that approval if status is automatic absent; atomically update status to present, store actual check-in time, and retain source, automatic absence time, approver, and approval timestamp. Keep the rider off duty.
- Reject the existing admin clear-absence action for automatic no-shows so it cannot bypass approval or erase the audit record; preserve it for existing manual absences.

- [x] **Step 1: Add service/route tests** for rider rejection, admin success, unauthenticated/non-admin rejection, manual-absence rejection, wrong-date rejection, duplicate approval, unapproved late check-in rejection, approved check-in, audit preservation, and unchanged `is_on_duty=false`.
- [x] **Step 2: Run focused service and route tests** in `server/services/__tests__/shiftSessions.test.ts` and `server/routes/__tests__/attendance-daily.test.ts`.
- [x] **Step 3: Implement transaction-safe approval and check-in handling** using the existing authentication middleware and shift-session transaction patterns. Do not use the duty-toggle endpoint as the approval mechanism.
- [x] **Step 4: Emit existing admin/rider attendance socket events only after commit**, with the rider ID/date/status needed for clients to refresh confirmed state.
- [x] **Step 5: Re-run focused service and route tests** and confirm approval does not alter attendance until actual check-in.

### Task 4: Admin attendance review and approval UI

**Files:**
- Modify: `src/app/pages/Admin/AttendanceDashboard.tsx` — display automatic no-show source, approval status, and action.
- Modify or create: `src/app/pages/Admin/__tests__/attendance-auto-absence.test.tsx` — cover the admin approval UI.

**Interfaces:**
- Extend `AttendanceRecord` to include the four audit fields from Task 1.
- Show an **Absent — automatic no-show** label for system-generated absences and **Approve late check-in** only for eligible auto-absence rows.
- Call the Task 3 endpoint with the selected date. On success, refresh the attendance list; on failure, retain current data and show an error.

- [x] **Step 1: Add component tests** for automatic vs manual absence labels, eligible action visibility, ineligible action absence, successful approval refresh, approval attribution, and failed approval feedback.
- [x] **Step 2: Run the focused dashboard test** with `npx vitest run src/app/pages/Admin/__tests__/attendance-auto-absence.test.tsx`.
- [x] **Step 3: Implement the source label and guarded approval action** using existing dashboard button, toast, and fetch patterns.
- [x] **Step 4: Re-run the dashboard test** and confirm automatic absences cannot use the manual clear action.

### Task 5: Rider late-check-in experience

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx` — allow check-in after approved auto-absence and refresh attendance from server-confirmed state.
- Modify: `mobile-app/services/apiService.ts` — add or adapt API handling only if the existing submission contract cannot express the approved transition.
- Modify: `mobile-app/components/__tests__/ShiftControlCard.test.tsx` — test approved and unapproved late check-in affordances.
- Modify: `mobile-app/components/ShiftControlCard.tsx` only if the existing absent state needs copy/action changes to explain admin approval.

**Interfaces:**
- Keep admin approval exclusively in the admin client; the rider app must not expose an approval control.
- After admin approval, the rider can perform the existing present/check-in action. The server remains authoritative and returns the confirmed session, attendance, and duty state.
- If the rider has not been approved, retain the absent/off-duty state and show that they must contact an administrator.

- [x] **Step 1: Add rider UI tests** proving an unapproved rider has no late-check-in action and an approved rider can check in without going On Duty.
- [x] **Step 2: Run the focused mobile tests** with `npm test -- --runInBand components/__tests__/ShiftControlCard.test.tsx`.
- [x] **Step 3: Update rider check-in handling and user-facing copy** to rely on server response; keep the separate **On duty** action as the only way to change duty status.
- [x] **Step 4: Re-run the mobile tests**; do not launch or test an emulator.

### Task 6: Integrated verification and graph refresh

**Files:**
- Verify changed paths from Tasks 1–5; do not modify unrelated files.
- Update generated graph artifacts with `graphify update .` after code changes.

- [x] **Step 1: Run available lint checks** for changed packages; record that root/server have no lint script or ESLint config.
- [ ] **Step 2: Run affected typechecks**; server and mobile pass, but root typecheck reports unrelated existing unused-symbol errors in `src/app/pages/Admin/AnalyticsHub.tsx`.
- [x] **Step 3: Run focused tests and the mobile package suite.** Focused server/admin tests pass; all 71 mobile suites pass.
- [x] **Step 4: Build affected server and frontend packages** using repository scripts; do not run an emulator.
- [x] **Step 5: Run `graphify update .`** and report unrelated pre-existing quality-gate failures without expanding scope to fix them.

## Dependency Order

Task 1 → Task 2 → Task 3 → Tasks 4 and 5 → Task 6. Tasks 4 and 5 may proceed independently after Task 3's API and response shape are fixed.
