# Overdue Operations Design

## Goal

Make overdue work immediately visible and actionable for administrators on the responsive web console and the mobile-admin app, while keeping the rider mobile experience focused on one clear next step. The implementation must use one server-owned overdue definition so the rider and both admin clients agree on what is overdue.

## Approved behavior

- An overdue request is approved, assigned/active, not terminal, and either has a delivery date before the current Philippine calendar date or is a same-day request at/after 7:00 PM Philippine time.
- Overdue metadata is computed by the API and returned with requests: `is_overdue`, `overdue_minutes`, `overdue_label`, and `recommended_action`.
- Admin clients expose an explicit Overdue queue with a count, urgency-first ordering, and compact action-oriented cards.
- The primary admin action depends on the current condition: track an in-progress rider, check a missing signal, contact a rider who has not started, or resolve the request as completed/failed.
- The existing completion/failure status endpoint remains the source of truth and continues to write status logs, audit data, notifications, and real-time events.
- Riders see overdue duration and a concise next-step message in the overdue card; existing sequence locking, tracking, offline status sync, and reason capture remain intact.

## Interfaces

- `GET /api/requests`, `GET /api/requests/:id`, and `GET /api/rider/tasks/active` return the same overdue metadata.
- `GET /api/requests/counts` returns a timezone-consistent `overdue` count.
- Admin status resolution continues through `PUT /api/requests/:id/status` with a required remark for terminal actions.

## UI behavior

### Responsive web admin

- Add an Overdue tab between Active and Completed with a visible count.
- Add overdue duration, recommended action, and a compact overdue banner to the request details panel.
- Keep desktop table/card density and use a stacked mobile card layout with 44px minimum touch targets.
- Reuse the existing tracking, route management, sequence deviation, complete, failed, revision, and cancel controls.

### Mobile admin

- Add an Overdue tab and badge to the Dispatch screen.
- Sort overdue jobs by urgency, then overdue duration.
- Show a concise overdue status row on cards and route the admin to the existing tracking/details screen.
- Add the same recommended action and terminal resolution controls to the mobile job detail screen.

### Rider mobile app

- Use API overdue metadata instead of a client-only date rule.
- Keep the Overdue tab and LATE badge, but add “late by” duration and the next-step message.
- Keep one primary route into the job and preserve existing sequence locks and completion/failure reporting.

## Error handling

- Missing or invalid dates return non-overdue metadata rather than blocking request loading.
- Status resolution failures retain the selected request, show an error, and do not remove it from the overdue queue.
- API/client clocks use the server metadata for classification; elapsed labels may refresh on the existing data refresh interval.

## Verification

- Unit-test overdue classification at 6:59 PM, 7:00 PM, midnight, prior dates, terminal statuses, and missing dates.
- Test the request counts and serialized metadata.
- Test web and mobile-admin sorting/filtering and rider overdue rendering with existing component/unit patterns.
- Run affected package quality gates: lint, typecheck, tests, and build/export.
