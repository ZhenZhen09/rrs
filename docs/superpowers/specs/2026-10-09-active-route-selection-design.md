# Active Route Selection Design

**Status:** Proposed  
**Date:** 2026-10-09

## Goal

Make it quick and clear for an admin to open route management from the Active task list on desktop and mobile, while reusing the existing rider route sequencer.

## Current context

- The admin experience is the Dispatch Console; Active tasks appear in rider queue order.
- `RequestCard` already supports a square multi-select control. `DispatchConsole` currently displays batch actions only for Pending.
- `RequestDetailsPanel` already exposes **Manage rider route**, which opens `EnhancedBatchApproveModal` in `route-review` mode with that rider’s complete active queue.
- The sequencer already pins started tasks and allows the remaining tasks to be reordered.

## Proposed interaction

1. In the Active tab, the admin enables selection using **Select tasks**. Desktop can expose the square selection controls directly; mobile uses the visible Select tasks action to enter selection mode. Do not make long-press the only or primary selection gesture.
2. The admin toggles square controls on reorderable active task cards. Started/in-progress tasks remain visible in the Mission Anchor and are not selectable for route changes.
3. A compact selection bar shows the count and **Manage route** and **Clear** actions. `Manage route` is disabled until the selection belongs to exactly one rider; selecting a task from a different rider is blocked with clear inline feedback.
4. Opening **Manage route** passes the selected task’s rider to the existing route-review handler. That handler loads the rider’s full active queue, preserving existing sequencing rules and pinned mission tasks. The selected subset is an entry point; it does not narrow or replace the rider’s full route.
5. The admin reviews/reorders the queue and saves using the existing **Save route order** action. On success, selection clears and the existing refresh/realtime behavior updates the Active list.
6. Active task selection is cleared when leaving Active, when the selected task is no longer active, when the route dialog closes without saving, or after a successful save.

## Responsive and accessibility behavior

- Desktop: square checkbox controls on eligible Active cards; selection action bar appears when at least one task is selected.
- Mobile: a visible **Select tasks** toggle in the Active list header enters/exits selection mode; square controls appear on eligible cards. The card itself remains usable for opening details. Tapping the checkbox toggles selection; long press is not required.
- Selection controls have accessible labels and keyboard operation. Mobile targets are at least 44×44 CSS pixels; visible focus and selected state are retained.
- The action bar communicates selection count in text, and the route action is a labeled button rather than icon-only.

## Constraints

- No new page, route, backend endpoint, database field, dependency, or route optimization behavior.
- Reuse `handleActiveResequence`, `EnhancedBatchApproveModal` (`route-review`), and the existing full-queue behavior.
- Do not permit a mixed-rider selection to route several riders through one sequencer session.
- Do not include started tasks in the selection count or selected set; the sequencer continues to pin them automatically.

## Acceptance criteria

- An admin can start active-task route management from selectable Active cards on desktop and mobile.
- A same-rider selection exposes Manage route and opens that rider’s full active queue in the existing sequencer.
- A selection spanning rider queues cannot be submitted and the reason is understandable.
- Pending batch assignment/revision/cancel behavior is unchanged.
- Clearing selection, changing tabs, stale task status, closing the review, and successful save do not leave stale active selections.
- Keyboard and touch users can select tasks and activate route management accessibly.

## UI guidance

The UI/UX Pro Max lookup supports visible touch targets of at least 44px, visible keyboard focus, and immediate active feedback. These apply to the mobile Select tasks toggle and square controls. This is a focused addition to the existing Dispatch Console visual language, not a new design system.
