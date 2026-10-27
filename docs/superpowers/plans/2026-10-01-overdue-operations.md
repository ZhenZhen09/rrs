# Overdue Operations Implementation Plan

## Context

The current rider app classifies overdue tasks locally, while the backend count and admin clients use different active-request groupings. This plan centralizes the definition and adds lean overdue queues and actions to the web admin, mobile-admin app, and rider mobile app.

## Files and responsibilities

### Backend

- Create `server/utils/overdue.ts` for the single timezone-aware overdue classifier and presentation metadata.
- Update `server/routes/requests.ts` to serialize overdue metadata and use the same predicate for counts.
- Update `server/routes/riderTasks.ts` to serialize the same metadata for rider tasks.

### Web admin

- Update `src/app/types/index.ts` with the overdue metadata shape.
- Update `src/app/context/DataContext.tsx` so the overdue count is retained and real-time refreshes update the queue.
- Update `src/app/pages/Admin/DispatchConsole.tsx` with an Overdue tab, count, sorting, and responsive action presentation.
- Update `src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx` with overdue context and a compact resolution action area.
- Add focused tests under `src/app/utils/__tests__` for shared client presentation helpers if needed.

### Mobile admin

- Update `mobile-admin/app/(tabs)/dispatch.tsx` with the Overdue tab, count, filter, and urgency/age ordering.
- Update `mobile-admin/components/Dispatch/PremiumJobCard.tsx` with overdue presentation.
- Update `mobile-admin/app/job/[id].tsx` with overdue context and fast complete/failed resolution.
- Update mobile-admin request mapping/types as needed.

### Rider mobile

- Update `mobile-app/types/index.ts` with API overdue metadata.
- Update `mobile-app/utils/taskFilters.ts` to prefer server metadata and keep a safe fallback for cached/legacy records.
- Update `mobile-app/app/(tabs)/overdue.tsx` with overdue duration and next-step presentation.
- Add/extend task filter tests for the server metadata path and fallback behavior.

## Execution order

1. Add failing backend classifier/count tests.
2. Implement the shared server overdue classifier and response metadata.
3. Add failing client/task classification tests.
4. Implement the rider fallback and metadata-driven UI.
5. Implement the responsive web admin queue and resolution context.
6. Implement the mobile-admin queue, cards, and job resolution context.
7. Run graphify update and the affected package quality gates.
8. Review the complete diff for regressions in existing status, sequence, tracking, and notification flows.

## Acceptance criteria

- Rider, web admin, and mobile-admin agree on which requests are overdue.
- Admin can find overdue work in one tab without searching the active list.
- Each overdue item exposes a clear next action.
- Admin can complete or fail an overdue request with a reason from both admin clients.
- Rider can see how late the task is and continue/report it without navigating through extra screens.
- Existing status logs, audit trails, notifications, sequence locks, and tracking continue to work.
- All applicable lint, typecheck, test, and build/export checks pass.
