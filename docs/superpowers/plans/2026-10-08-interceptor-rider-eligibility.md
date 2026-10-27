# Interceptor Rider Eligibility Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Make The Interceptor's batch rider picker and submit action follow the same date-aware availability rules as single-task assignment and the server.

**Architecture:** Reuse `getRiderAvailability` and `isScheduledForToday` from `src/app/utils/riderAvailability.ts`. A batch requires same-day eligibility when at least one selected request is scheduled for today in Asia/Manila; a future-only batch ignores today's attendance, duty, and presence. Keep route review fixed to its already assigned rider. The server already validates the batch when any selected task is scheduled today; add a regression test for mixed-date batches.

**Tech Stack:** React, TypeScript, Testing Library, Vitest, Express route tests.

**Approved behavior:** Same-day assignment requires online and on duty; Absent and On Leave block; missing attendance is allowed when online and on duty. Future-only work ignores today's status. See [Rider Availability and Selection Guard plan](2026-10-08-rider-availability-selection.md).

## Review Focus

- Same-day online/on-duty with no attendance report is selectable and displays Online.
- Same-day Absent, On Leave, offline, and off-duty riders are disabled.
- Future-only batches permit selection regardless of today's attendance, duty, or presence while showing actual Online/Offline status.
- Mixed today/future batches use same-day eligibility in both the picker and API.
- If an eligible selected rider becomes ineligible before submit, Assign tasks is disabled and cannot call `onConfirm`.
- Route review keeps the fixed rider and does not expose a rider picker.

## Task 1: Apply date-aware eligibility in The Interceptor

**Files:**
- Modify `src/app/components/Admin/EnhancedBatchApproveModal.tsx`
- Create `src/app/components/Admin/__tests__/interceptor-rider-availability.test.tsx`

- [x] Add tests for a same-day no-report rider being enabled, each same-day blocking status, and a future-only batch remaining selectable for an Absent/off-duty/offline rider.
- [x] Add a mixed-date test proving that a batch containing today's task blocks an offline rider.
- [x] Add a selected-rider freshness test: choose an eligible rider, rerender with that rider unavailable, and assert Assign tasks is disabled and `onConfirm` remains uncalled.
- [x] Add a route-review test confirming only the fixed rider display is shown.
- [x] Run the focused test and confirm it fails because the current picker only checks Absent/off-duty and always labels unavailable as Offline.
- [x] In batch-assign mode, calculate `requiresTodayAvailability = selectedRequests.some((request) => isScheduledForToday(request.delivery_date))`. Evaluate every rider with `getRiderAvailability(rider, requiresTodayAvailability)`; derive Online/Offline from `rider.is_online` independently. Keep the list visually compact: avatar, rider name, and Online/Offline. Keep the ineligible reason in the button's accessible name.
- [x] Recompute eligibility for `batchRiderId` from the current `riders` prop and current selected requests. Refuse `handleConfirm` and disable Assign tasks when there is no selected rider or that rider is no longer eligible. Do not add this picker or rule to route-review mode.
- [x] Rerun the focused tests and verify same-day, future-only, mixed-date, stale-selection, and route-review behavior.

## Task 2: Lock server behavior for mixed-date batches

**Files:**
- Modify `server/routes/__tests__/request-assignment-queue.test.ts`

- [x] Add a batch route regression test with one task scheduled today and one future task, and a rider who is offline. Expect HTTP 409 with `RIDER_UNAVAILABLE`; verify queue append and database update do not happen.
- [x] Run the focused route test and confirm it passes against the existing server validator, which checks availability when any assigned delivery date is today.

## Task 3: Quality gate and graph refresh

**Files:**
- Verify affected web and server packages; refresh `graphify-out/`.

- [x] Check for a configured lint script. If none exists, report lint as unavailable without adding one.
- [x] Run `npx tsc --noEmit`.
- [x] Run the focused Interceptor UI and request assignment route tests.
- [x] Run `npm run build:frontend`.
- [x] Run `graphify update .` and `git diff --check`.
