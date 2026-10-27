# Multiple Rider Shift Sessions Design

**Status:** Draft for review

## Goal

Track each rider work period as a separate shift session so multiple start/end cycles in one Philippine-local day have accurate durations, handover records, and retry-safe behavior.

## Current problem

`attendance_logs` stores one row per rider per day. Reopening a shift clears that row's end time, while its original start time remains. A later end therefore makes the dashboard duration include the off-duty break. Retrying an end request can also overwrite the end time or add another duty-off event.

## User experience

- Starting while no shift is open creates a new session with its own start time.
- Starting while a session is already open returns the existing session; it does not create a duplicate.
- Ending closes the open session. If active tasks remain, the rider must provide a nonblank handover reason. Those tasks stay assigned to the rider, and the saved session records the handover reason and active-task count at end time.
- Starting again later creates another session. The break between sessions is excluded from each session duration and from the day's total working time.
- Retrying the same start or end request returns its original result and does not change timestamps or create duplicate events.
- The admin attendance view lists that day's sessions, their durations, handover information, and the sum of closed session durations. An open session is shown as in progress.

## Data model

Add a `shift_sessions` table with:

- `id`: unique session ID.
- `rider_id`: owning rider.
- `start_time`: server-recorded Philippine-local timestamp.
- `end_time`: nullable until the session closes.
- `session_state`: `open`, `closed`, or `legacy_unknown`. New sessions transition from open to closed; legacy rows with no recorded end retain an unknown state unless they are the rider's current same-day shift.
- `start_operation_id`: client-generated idempotency key, unique per rider.
- `end_operation_id`: nullable client-generated idempotency key, unique per rider when present.
- `handover_reason`: nullable trimmed reason captured when closing with active tasks.
- `active_task_count_at_end`: nullable count captured when the session closes.
- `created_at` and `updated_at` timestamps.

At most one session may be open for a rider. Enforce this by serializing start/end transitions in a database transaction while locking that rider's user row, then checking/updating the session. Do not alter delivery task assignments during shift end.

Keep `attendance_logs` as the daily attendance status source for present/absent/on-leave checks used by dispatch and rider access. Its single-row-per-day timestamp fields are legacy daily markers, not the source for session durations. Update session-aware admin reporting to read `shift_sessions`; update any analytics that calculate worked duration from `attendance_logs` to sum session durations instead.

## Server behavior

- Start and end remain rider-authenticated actions and may only affect the authenticated rider's own sessions.
- A start request includes a stable `operation_id`. In one transaction, the server locks the rider, returns the session associated with that operation if it already exists, returns the current open session for a repeated/concurrent start, or creates a new session and marks the rider on duty.
- An end request includes a stable `operation_id` and optional reason. In one transaction, the server locks the rider, resolves an already-processed operation idempotently, verifies an open session exists, checks current active tasks, requires a trimmed reason when tasks exist, closes the session, records handover event metadata, and marks the rider off duty.
- If any required database write fails, roll back the transaction. Do not send success or publish state-change notifications before commit.
- A new end attempt when no session is open returns a clear conflict response; replaying the same completed end operation returns its completed session.
- Admin daily attendance API returns per-rider session rows plus daily total duration and active task count. Socket notifications refresh the admin view after committed state changes.

## Mobile behavior

- Obtain the rider's current session state from the server on app startup/refresh; local storage may cache it but cannot override the server.
- Generate one operation ID per user action and retain it through retries until a definitive response arrives.
- On successful start/end, update local duty state from the server response.
- On `HANDOVER_REQUIRED`, switch from the simple end confirmation to the handover form, including when the local task list was stale.
- On network or persistence failure, keep the relevant dialog and entered reason available for retry. A retry uses the same operation ID.

## Admin behavior

- Display each session's start, end, duration, current/open state, and handover reason/task count.
- Show total completed session time for the selected date; do not count breaks or an open session as completed time.
- Keep daily attendance status and active-task conflict indicators available.
- Older records are represented as one legacy session when their daily attendance record has a check-in time. A recorded off-duty time is preserved. A missing historical end remains unknown, is excluded from completed work totals, and does not block a new shift. A same-day legacy row is considered open only if the rider is persisted as on duty.

## Migration and compatibility

- Add a migration that creates `shift_sessions` and backfills one session from each `attendance_logs` row with a non-null `check_in_time`.
- Make the migration repeatable without creating duplicate legacy sessions.
- Preserve existing attendance status queries and API fields needed by dispatch. Migrate admin/analytics duration displays to session-based data before treating legacy `check_in_time` and `off_duty_time` as non-authoritative.
- Do not automatically reassign unfinished tasks. Admin coordination/reassignment remains an explicit admin action.

## Acceptance criteria

1. Two or more start/end cycles on one date appear as separate sessions with independent durations.
2. The day's total equals the sum of closed sessions and excludes off-duty breaks.
3. A repeated start/end with the same operation ID does not create another session or change its timestamps.
4. Concurrent starts cannot create two open sessions for one rider.
5. Ending with active tasks and no/whitespace reason is rejected; valid handover closes the session and leaves task assignments unchanged.
6. Database failure leaves both rider duty state and session state unchanged and emits no success notification.
7. Admin sees each handover reason and the task count recorded when that session ended.
8. Existing single-session attendance history remains visible after migration.

## Out of scope

- Automatic task reassignment or task cancellation.
- Payroll rules, overtime policy, or minimum/maximum shift length rules.
- Multiple simultaneously open shifts for one rider.
