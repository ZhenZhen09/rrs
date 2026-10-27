# Rider Availability and Selection Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Dispatch’s online indicator synchronized with the rider map, allow same-day assignment to online, on-duty riders with no attendance report, and make ineligible rider cards impossible to select.

**Architecture:** Reuse the existing live rider feed and socket presence; let an explicit socket state override the feed’s cached online value. Centralize same-day UI eligibility in a small pure utility consumed by the rider list and assignment action, and align the server’s existing same-day validator with that rule. Show online presence separately from attendance, and guard pointer, keyboard, stale-selection, and API validation paths.

**Tech Stack:** React, TypeScript, React Testing Library, Vitest, existing Socket.IO presence and `/api/users/riders/live` data.

**Spec:** [Lean Dispatch Assignment and Queue Design](../specs/2026-10-08-lean-dispatch-assignment-queue-design.md), with the user-approved same-day availability clarification recorded in this plan.

## Global Constraints

- Same-day assignment requires `is_online === true` and `is_on_duty === true`.
- For same-day tasks, `attendance_status === 'absent'` or `'on_leave'` blocks assignment, even when online and on duty.
- Missing same-day attendance is informational (`NO REPORT`); it does not block an online, on-duty rider.
- For tomorrow/future tasks, do not gate assignment on today's attendance, online presence, or duty state; show online/offline as information only. The live-rider feed has no scheduled-leave-by-date data, so do not infer a future conflict from today's leave status.
- Preserve the single-rider-choice assignment flow.
- An unavailable card must not change selection by pointer or keyboard, and an unavailable selected rider must not be submitted.
- Prefer explicit live socket presence over stale API `is_online`; use the API value only when live presence has no entry.
- Keep assignment API contracts, attendance recording, rider-map behavior, and queue ordering unchanged. Update the existing server-side same-day eligibility validation to match the approved rule. Do not add future-date leave checks because there is no date-specific leave source.

## Review Focus

- **Online and on duty with no report:** eligible for a same-day task, with `NO REPORT` still visible as information; test in Task 1 and Task 2.
- **Absent or on leave but online for a same-day task:** remains ineligible; test in Task 1 and Task 2.
- **Online state changes to offline:** socket `offline` overrides stale API `true`; test in Task 1 and Task 2.
- **Rider becomes unavailable after selection:** assignment action is disabled and cannot submit; test in Task 2.
- **Future-dated task:** today's attendance, duty, and connection state do not block assignment; test in Task 1 and Task 2.

---

### Task 1: Define rider presence and same-day eligibility

**Files:**
- Create: `src/app/utils/riderAvailability.ts`
- Create: `src/app/utils/__tests__/riderAvailability.test.ts`
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Modify: `server/routes/requests.ts`
- Modify: `server/routes/__tests__/request-assignment-queue.test.ts`

**Interfaces:**
- Produces `resolveRiderOnlineState(socketState, apiOnline)`, where `socketState` is `'online' | 'offline' | undefined` and the result is a boolean. An explicit socket value wins; `apiOnline` is the fallback.
- Uses `RiderAvailabilityInput = { attendance_status?: 'present' | 'absent' | 'on_leave' | null; is_on_duty?: boolean; is_online?: boolean }` and returns `RiderAvailability = { eligible: boolean; blockReason?: 'ON LEAVE' | 'ABSENT' | 'OFF-DUTY' | 'OFFLINE'; notice?: 'NO REPORT' }`.
- Produces `getRiderAvailability(rider, isSameDay)`, returning `{ eligible: boolean; blockReason?: 'ON LEAVE' | 'ABSENT' | 'OFF-DUTY' | 'OFFLINE'; notice?: 'NO REPORT' }`.
- Same-day evaluation blocks On Leave, Absent, off-duty, and offline riders, in that precedence order. Missing attendance adds the `NO REPORT` notice only. For future dates, today's attendance, online presence, and duty state do not affect eligibility; they remain visible as information.

- Update `getRiderAvailabilityIssue` in `server/routes/requests.ts` to enforce the same same-day rule: online and on duty are required, Absent and On Leave remain blocked, and missing attendance alone is allowed. Preserve the current behavior that skips these current-day checks for future-dated tasks.
- Add route-level regression coverage for direct assignment and batch/reassignment paths: same-day no-report success, same-day absent/on-leave/offline/off-duty rejection, and future-task assignment without current-day signals.

- [ ] **Step 1: Write failing utility tests**

Add cases for online plus on-duty with no attendance, absent despite online/on-duty, on leave, off-duty, offline, explicit socket offline overriding API online, API fallback with no socket entry, and a future task despite today's leave, offline, and off-duty state.

```ts
it('allows an online on-duty rider with no same-day attendance report and keeps the notice', () => {
  expect(getRiderAvailability({ is_online: true, is_on_duty: true, attendance_status: null }, true))
    .toEqual({ eligible: true, notice: 'NO REPORT' });
});

it('blocks an absent rider even when online and on duty', () => {
  expect(getRiderAvailability({ is_online: true, is_on_duty: true, attendance_status: 'absent' }, true))
    .toEqual({ eligible: false, blockReason: 'ABSENT' });
});

it('lets an explicit offline socket event override stale API presence', () => {
  expect(resolveRiderOnlineState('offline', true)).toBe(false);
});

it('ignores today\'s attendance and presence for a future task', () => {
  expect(getRiderAvailability({ attendance_status: 'on_leave', is_on_duty: false, is_online: false }, false))
    .toEqual({ eligible: true });
});
```

- [ ] **Step 2: Run the utility test and confirm the expected failure**

Run: `npx vitest run src/app/utils/__tests__/riderAvailability.test.ts`

Expected: FAIL because the new utility exports do not exist.

- [ ] **Step 3: Implement the pure availability helpers**

Add the two exported functions with the interfaces above. Keep the helper independent of React and socket APIs so all consumers use the same rule.

```ts
export function resolveRiderOnlineState(
  socketState: 'online' | 'offline' | undefined,
  apiOnline?: boolean,
): boolean {
  if (socketState === 'online') return true;
  if (socketState === 'offline') return false;
  return Boolean(apiOnline);
}

export function getRiderAvailability(rider: RiderAvailabilityInput, isSameDay: boolean): RiderAvailability {
  if (!isSameDay) return { eligible: true };
  if (rider.attendance_status === 'on_leave') return { eligible: false, blockReason: 'ON LEAVE' };
  if (rider.attendance_status === 'absent') return { eligible: false, blockReason: 'ABSENT' };
  if (!rider.is_on_duty) return { eligible: false, blockReason: 'OFF-DUTY' };
  if (!rider.is_online) return { eligible: false, blockReason: 'OFFLINE' };
  return rider.attendance_status
    ? { eligible: true }
    : { eligible: true, notice: 'NO REPORT' };
}
```

- [ ] **Step 4: Use socket presence as the live override in DispatchConsole**

Update `reactiveRiders` so explicit socket `online` maps to `true`, explicit socket `offline` maps to `false`, and a missing socket entry falls back to the rider API’s `is_online`. Keep `/api/users/riders/live` and its attendance fields unchanged.

- [ ] **Step 5: Run utility tests and confirm they pass**

Run: `npx vitest run src/app/utils/__tests__/riderAvailability.test.ts`

Expected: PASS for all eligibility and presence precedence cases.

- [ ] **Step 6: Commit the availability rule and presence precedence**

```bash
git add src/app/utils/riderAvailability.ts src/app/utils/__tests__/riderAvailability.test.ts src/app/pages/Admin/DispatchConsole.tsx
git commit -m "fix: clarify live rider availability"
```

### Task 2: Display availability separately and enforce selection

**Files:**
- Modify: `src/app/components/Admin/Dispatch/RiderSelectionList.tsx`
- Modify: `src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx`
- Create: `src/app/components/Admin/Dispatch/__tests__/rider-selection-availability.test.tsx`
- Create: `src/app/components/Admin/Dispatch/__tests__/request-details-availability.test.tsx`

**Interfaces:**
- `RiderSelectionList` uses `getRiderAvailability` for both labels and selection behavior.
- The rider card reports Online/Offline independently from attendance. `NO REPORT` remains a separate notice and does not gray out an otherwise eligible rider.
- The assignment button rechecks the selected rider against the current rider list and scheduled date before invoking `onApprove`.

- [ ] **Step 1: Write failing rider-card interaction tests**

Render a same-day rider who is online, on duty, and has no attendance report. Verify the card shows Online and `NO REPORT`, is selectable by click and keyboard, and calls `onSelect`. Render online Absent and On Leave riders; verify they show a disabled state and neither click nor Enter/Space calls `onSelect`. Also verify offline and off-duty riders cannot be selected for today. For a future task, verify today's offline, off-duty, Absent, and On Leave states do not disable selection.

- [ ] **Step 2: Run the focused UI test and confirm the expected failures**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/rider-selection-availability.test.tsx`

Expected: FAIL because online presence is not displayed independently and the card currently calls `onSelect` unconditionally.

- [ ] **Step 3: Implement clear status labels and a real disabled interaction**

In `RiderSelectionList`, show Online/Offline from `is_online`; for same-day riders with missing attendance, show `NO REPORT` as a non-blocking notice. Use the shared availability helper. Guard the selection handler before calling `onSelect`; expose disabled state to assistive technology and prevent keyboard selection when ineligible.

```tsx
const selectRider = () => {
  if (!availability.eligible) return;
  onSelect(rider.id);
};

<Card
  role="button"
  aria-disabled={!availability.eligible}
  tabIndex={availability.eligible ? 0 : -1}
  onClick={selectRider}
  onKeyDown={(event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectRider();
  }}
>
  {/* Keep online state and attendance notice as separate visible labels. */}
</Card>
```

- [ ] **Step 4: Guard the final assignment action against stale selection**

In `RequestDetailsPanel`, resolve the currently selected rider from the latest `riders` prop and recompute eligibility for this request’s delivery date. Compute `isSameDay` with the same `deliveryDate === todayStr` comparison already used by `RiderSelectionList`. Disable the Assign button and refuse its click when that rider is no longer eligible. Keep the normal single-choice flow unchanged for an eligible rider.

```tsx
const selectedRider = riders.find((rider) => rider.id === selectedRiderId);
const canAssign = Boolean(
  selectedRider && getRiderAvailability(selectedRider, isSameDay).eligible,
);

const assignSelectedRider = () => {
  if (!selectedRider || !canAssign) return;
  onApprove(selectedRider.id, adminNote);
};
```

- [ ] **Step 5: Add selected-rider status-change regression coverage**

In `request-details-availability.test.tsx`, render `RequestDetailsPanel` with a pending request and a mock `RiderSelectionList` that selects an eligible rider. Rerender the panel with that rider absent, offline, or off-duty; verify the Assign button is disabled and `onApprove` is not called. Also verify an online, on-duty rider with no report can proceed.

- [ ] **Step 6: Run focused UI tests and confirm they pass**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/rider-selection-availability.test.tsx src/app/components/Admin/Dispatch/__tests__/request-details-availability.test.tsx src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx src/app/components/Admin/Dispatch/__tests__/read-only-details.test.tsx`

Expected: availability labels remain distinct, ineligible riders cannot be selected by pointer or keyboard, stale selection cannot be submitted, and the single-assignment flow still uses one rider choice.

- [ ] **Step 7: Commit the availability display and selection guard**

```bash
git add src/app/components/Admin/Dispatch/RiderSelectionList.tsx src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx src/app/components/Admin/Dispatch/__tests__/rider-selection-availability.test.tsx src/app/components/Admin/Dispatch/__tests__/request-details-availability.test.tsx
git commit -m "fix: enforce rider availability selection"
```

### Task 3: Validate the dispatch package and perform manual acceptance

**Files:**
- Verify: root web/admin package and `graphify-out/`

- [ ] **Step 1: Run the applicable quality gate in order**

The root package has no lint script or ESLint configuration; report lint as unavailable without adding either. Then run:

1. Typecheck: `npx tsc --noEmit`
2. Tests: `npx vitest run src/app/utils/__tests__/riderAvailability.test.ts src/app/components/Admin/Dispatch/__tests__/rider-selection-availability.test.tsx src/app/components/Admin/Dispatch/__tests__/request-details-availability.test.tsx src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx src/app/components/Admin/Dispatch/__tests__/read-only-details.test.tsx server/routes/__tests__/request-assignment-queue.test.ts`
3. Builds: `npm run build:frontend` then `npm --prefix server run build`

Stop at the first failure, fix it, and rerun the applicable sequence from typecheck. The server build covers the updated assignment validation.

- [ ] **Step 2: Refresh the project graph**

Run: `graphify update .`

Expected: graph JSON and report include the shared rider availability helper and the dispatch consumers.

- [ ] **Step 3: Manually verify the same-day availability flow**

In Dispatch, open same-day pending request `#21949478` if it is still pending. Verify:

1. For today's task, confirm `test@company.com` is online and on duty. With no attendance report, the rider shows both `ONLINE` and `NO REPORT`, can be selected, and can be assigned.
2. An Absent or On Leave rider remains blocked for today's task even if online and on duty.
3. Offline and off-duty riders remain blocked for a same-day task.
4. If a selected rider goes offline before assignment, the Assign action disables and does not submit.
5. For a tomorrow/future task, today's attendance, online, and duty states do not block assignment; Online/Offline remains informational.
6. The rider map and Dispatch card reflect explicit online/offline socket changes without requiring a page reload.

Expected: Online presence, attendance, and assignment eligibility are visibly distinct, and the card’s visual disabled state matches its pointer and keyboard behavior.
