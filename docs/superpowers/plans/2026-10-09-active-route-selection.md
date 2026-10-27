# Active Route Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible cross-device way to select active tasks and launch the existing route sequencer for one rider.

**Architecture:** Extend the current Dispatch Console selection state to Active tasks, keep Pending bulk behavior separate, and use `RequestCard`’s existing square control. A small responsive selection bar launches the current `route-review` flow for the selected rider; the sequencer continues to load and save that rider’s full active queue.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, Radix UI, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-active-route-selection-design.md`

## Global Constraints

- Do not add a new page, route, backend endpoint, database field, dependency, or route optimization behavior.
- Reuse `handleActiveResequence`, `EnhancedBatchApproveModal` in `route-review` mode, and the existing full-queue behavior.
- Keep selection within a single rider; do not allow a mixed-rider selection to be submitted.
- Keep started tasks pinned and not selectable.
- Do not change Pending batch actions.
- Touch targets on mobile are at least 44×44 CSS pixels; controls have accessible names and visible keyboard focus.

## Review Focus

- **Mixed rider selection:** selecting across riders must not open an ambiguous route review; test the selection guard and visible reason.
- **Task changes status while selected:** selection must be pruned when the task is no longer active; test stale selection reconciliation.
- **Started task selection:** mission-anchor tasks remain pinned and cannot be selected; test card/list selection behavior.
- **Tab and modal transitions:** leaving Active or closing review must clear Active selection; test each transition.
- **Existing Pending regression:** Pending selection still presents only its current batch actions; test the Pending path.

---

## File Structure

- `src/app/pages/Admin/DispatchConsole.tsx`: Owns filter-specific selection state, eligible task/rider validation, selection cleanup, and opening existing route review.
- `src/app/components/Admin/Dispatch/RequestList.tsx`: Renders selection-mode affordance and forwards whether Active selection is enabled.
- `src/app/components/Admin/Dispatch/RequestCard.tsx`: Reuses the square control, hides/disables it for mission tasks or when Active selection mode is off, and preserves detail-card navigation.
- `src/app/pages/Admin/__tests__/active-route-selection.test.tsx` (or the repository’s established colocated test location): Covers selection and route-launch behavior.
- `src/app/components/Admin/Dispatch/__tests__/active-route-selection-ui.test.tsx`: Covers desktop/mobile list affordances and mission-task exclusion.

### Task 1: Add active selection state and route launch

**Files:**
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Test: `src/app/pages/Admin/__tests__/active-route-selection.test.tsx`

**Interfaces:**
- Consumes: `DeliveryRequest`, `isActiveRequest`, `interceptData`, `setInterceptData`, and existing `route-review` modal props.
- Produces: active selection state and callbacks passed into `RequestList`; route launch uses selected task’s `assigned_rider_id` and sets `interceptData` with every active task for that rider.

- [ ] **Step 1: Write a failing test for same-rider route launch**

Render the Dispatch Console with two active tasks for rider A and one for rider B. Select both rider A tasks, activate Manage route, and assert the route-review modal receives rider A and both active tasks, including an unselected task in rider A’s queue.

- [ ] **Step 2: Run the targeted test and verify failure**

Run: `npx vitest run src/app/pages/Admin/__tests__/active-route-selection.test.tsx`
Expected: FAIL because Active selection and its Manage route action are not wired yet.

- [ ] **Step 3: Add Active selection state and route launch handler**

Keep Pending bulk selection semantics isolated. For Active selection, derive selected tasks from current `requests`, require all selected tasks to remain active and share one non-empty `assigned_rider_id`, and launch route review using the selected rider’s full active queue:

```tsx
const selectedActiveTasks = (requests || []).filter(
  (request) => activeSelectedIds.includes(request.request_id) && isActiveRequest(request),
);
const selectedRiderIds = new Set(selectedActiveTasks.map((request) => request.assigned_rider_id).filter(Boolean));
const canManageSelectedRoute = selectedActiveTasks.length > 0 && selectedRiderIds.size === 1;
```

The handler should populate `interceptData.requests` with `(requests || []).filter(request => request.assigned_rider_id === riderId && isActiveRequest(request))` and set `mode: 'route-review'`. Never pass only the selected subset to the sequencer.

- [ ] **Step 4: Test mixed-rider block and stale selection pruning**

Add tests proving a mixed-rider selection cannot launch route review and a task that becomes terminal is removed from the eligible selection/count.

- [ ] **Step 5: Run the targeted test and verify pass**

Run: `npx vitest run src/app/pages/Admin/__tests__/active-route-selection.test.tsx`
Expected: PASS for same-rider queue inclusion, mixed-rider blocking, and stale task pruning.

- [ ] **Step 6: Clear selection on defined lifecycle transitions**

Clear Active selection and exit selection mode when the status tab changes away from Active, when route review closes, and after successful resequencing. Preserve Pending’s existing selection and clearing behavior.

- [ ] **Step 7: Test tab, close, save, and Pending regression paths**

Assert Active selections clear on each transition; assert Pending selections still expose revision, approve/enforce, and cancel actions and do not show Manage route.

- [ ] **Step 8: Run targeted tests**

Run: `npx vitest run src/app/pages/Admin/__tests__/active-route-selection.test.tsx`
Expected: PASS for lifecycle cleanup and unchanged Pending actions.

### Task 2: Add responsive selection controls and action bar

**Files:**
- Modify: `src/app/components/Admin/Dispatch/RequestList.tsx`
- Modify: `src/app/components/Admin/Dispatch/RequestCard.tsx`
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Test: `src/app/components/Admin/Dispatch/__tests__/active-route-selection-ui.test.tsx`

**Interfaces:**
- Consumes: Task 1’s `activeSelectedIds`, selection-mode state, toggle/clear callbacks, same-rider eligibility, and route-launch callback.
- Produces: visible desktop selection controls, mobile Select tasks mode, and a labeled selection bar with count, Manage route, and Clear.

- [ ] **Step 1: Write failing UI tests for Active selection affordances**

Verify desktop renders square selection controls for eligible active cards; mobile exposes a visible Select tasks toggle and only then renders those controls; started mission tasks are not selectable.

- [ ] **Step 2: Run UI tests to verify failure**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/active-route-selection-ui.test.tsx`
Expected: FAIL because the list does not yet receive an Active selection mode.

- [ ] **Step 3: Add Active selection-mode props to RequestList**

Add explicit props for selection mode, selected active IDs, toggle callback, and Select tasks toggle. Forward selection only to reorderable Active cards; do not wire the mission-anchor list to the selection callback. Keep Pending card selection props unchanged.

- [ ] **Step 4: Render active card controls without breaking card navigation**

Use the existing `RequestCard` checkbox. Ensure checkbox activation toggles selection without triggering card detail navigation, controls expose `aria-label` and `aria-pressed`, and mission-anchor tasks have no selection control.

- [ ] **Step 5: Add responsive affordances and action bar**

On desktop, show square controls for eligible Active cards without requiring a mode toggle. On mobile, render a labeled **Select tasks** control in the Active header; selection mode shows square controls and an **Exit selection** action. When count is nonzero, show a compact bar with `N selected`, **Manage route**, and **Clear**. Disable Manage route for mixed-rider selection and provide inline text explaining “Select tasks for one rider at a time.”

Use at least `min-h-11 min-w-11` on mobile interactive controls, visible `focus-visible` styling, and selected/pressed state styling. Retain the existing card tap behavior outside checkbox activation.

- [ ] **Step 6: Test selected count, mixed-rider hint, and touch/accessibility affordances**

Assert the count, route button enabled/disabled state, inline mixed-rider hint, accessible checkbox names, keyboard focusability, and mobile selection toggle label.

- [ ] **Step 7: Run UI tests**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/active-route-selection-ui.test.tsx`
Expected: PASS for desktop/mobile selection, mixed-rider hint, and mission exclusion.

### Task 3: Verify route review integration and quality gates

**Files:**
- No new source files; update earlier tests only if integration reveals a missing acceptance case.

**Interfaces:**
- Consumes: active selection controls and route-launch behavior from Tasks 1–2.
- Produces: verified integration using existing `EnhancedBatchApproveModal` and resequence endpoint.

- [ ] **Step 1: Add integration assertion for pinned mission plus full queue**

Given one started task, two reorderable tasks, and one selected reorderable task for the same rider, assert route review receives the full active set and the existing sequencer presents the started task as pinned while preserving queue order for eligible work.

- [ ] **Step 2: Run targeted dispatch tests**

Run: `npx vitest run src/app/pages/Admin/__tests__/active-route-selection.test.tsx src/app/components/Admin/Dispatch/__tests__/active-route-selection-ui.test.tsx src/app/components/Admin/Dispatch/__tests__/assignment-flow.test.tsx`
Expected: PASS.

- [ ] **Step 3: Run required repository quality gates in project order**

Follow `AGENTS.md`: lint → typecheck → test → build. Use the repository’s declared scripts/configuration for each stage. Stop at the first failure, fix it, then rerun the complete sequence. Do not report completion with a skipped or failing stage.

- [ ] **Step 4: Refresh the code knowledge graph**

Run: `graphify update .`
Expected: graphify completes and updates graph output for the changed code.

- [ ] **Step 5: Review final diff**

Run `git diff --check` and inspect `git diff -- src/app/pages/Admin/DispatchConsole.tsx src/app/components/Admin/Dispatch/RequestList.tsx src/app/components/Admin/Dispatch/RequestCard.tsx`. Confirm no Pending action behavior or unrelated files changed.
