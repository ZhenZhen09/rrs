# Lean Dispatch Assignment and Queue Design

## Goal

Make rider assignment a single-choice action and keep every rider's active task order consistent across direct assignments, batch assignments, manual route review, and the Active/Overdue dispatch views.

## Current Problem

The dispatch details panel selects a rider. A single assignment goes directly to `PUT /api/requests/:id/approve` when the rider has no active requests, but opens The Interceptor when active requests exist. The interceptor asks for a rider a second time and assigns the merged sequence through `/api/requests/mass-update`. Direct approval does not update `queue_order`; the interceptor and `/api/requests/resequence` do. The resulting queue behavior depends on which UI path was taken.

The dispatch card displays `queue_order` as a rank. That rank belongs to a rider's queue, not to the whole Active or Overdue tab. Two riders may each have a first task; tasks for one rider must not receive duplicate ranks in that rider's active queue.

## Approved Workflow

1. The details panel is the single rider-selection point for a single assignment.
2. Assigning a single task does not automatically open a route modal. The backend adds it to the end of the selected rider's active queue; an empty queue starts at rank 1.
3. Batch assignment keeps one rider selector. The selected new tasks can be ordered within the batch, and the backend appends that batch to the rider's existing queue.
4. The existing route-order modal remains available from Manage Route for deliberate manual resequencing. It is scoped to the already selected rider and does not allow changing riders.
5. The backend owns all queue reads, validation, locking, and rank writes in transactions. Client-provided sequences are validated against the authoritative active queue before any rank is changed.
6. A rider has one active sequence across delivery dates. Approved assigned/in-progress work, including overdue work, remains in the sequence. Terminal work is excluded. Tasks in `in_progress`, `arrived`, `picked_up`, `arrived_at_pickup`, or `arrived_at_dropoff` are considered started; started tasks remain ahead of tasks that have not started.
7. The Active and Overdue views display ranks from this same per-rider sequence. Queue order is not reset per tab or delivery date.
8. If the queue changed after the admin loaded it, the operation returns a conflict and the UI refreshes instead of silently applying a stale sequence.

## Out of Scope

- Automatic route-distance optimization or SLA-based reordering.
- Changing rider eligibility rules, task statuses, notification content, or mobile rider sequencing behavior.
- Reworking batch selection beyond keeping its existing single rider selection and ordering of selected new tasks.

## Acceptance Criteria

- Repeated direct assignments to one rider receive distinct, sequential queue positions.
- Batch assignment appends its selected tasks after existing active tasks and preserves the selected batch order.
- Manual route review cannot change the selected rider, omit active tasks, add unknown tasks, duplicate IDs, or move a started task behind unstarted work.
- Concurrent assignments to the same rider serialize through a database lock and do not create duplicate queue ranks.
- Reassignment removes work from the old rider's active sequence and appends it to the new rider's sequence atomically.
- Active and Overdue cards show the same rank for a given task and sort by rider then queue order when sequence sorting is selected.
- Failed validation or persistence leaves both rider assignment and queue order unchanged.
