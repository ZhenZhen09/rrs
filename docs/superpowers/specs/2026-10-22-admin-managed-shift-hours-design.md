# Admin-managed rider shift hours and automatic cutoff

**Status:** Design for review
**Date:** 2026-10-22

## Intent and agreed behavior

Admins need one shared schedule for all riders so an unattended shift cannot remain open overnight. The initial automatic end time is **7:00 PM Philippine time**. An admin sets both the earliest On Duty time and automatic End shift time on a new web dashboard page. At the end time, every open rider shift closes even if the rider has today, upcoming, overdue, or in-progress tasks. The rider cannot go On Duty again that day, and those assignments are hidden in the rider app. Unfinished tasks remain visible to admins for follow-up. The cutoff works without the rider's phone or internet connection. Schedule edits take effect the following Philippine calendar day.

The agreed flow does not specify an initial On Duty time. The admin must set it before enabling the schedule. No per-rider schedules or overtime exceptions are included in this version.

## Current behavior being changed

- `server/services/shiftSessions.ts` permits multiple start/end sessions in one day. Manual end requires a handover reason when active tasks remain. It records `end_time` as the request time and writes `attendance_logs.off_duty_time` to the current day's row.
- `server/routes/users.ts` exposes rider attendance, duty, and end-shift routes. Its sweep endpoint is a development simulator, not a production cutoff.
- `mobile-app/context/LocationContext.tsx` obtains the open session and current attendance from the server. The rider task tabs already gate much of their display on open shift and On Duty state, while the Shift Control card still offers On Duty after a completed session.
- `src/app/pages/Admin/AdminLayout.tsx` has an admin Settings section and can host a Shift Hours page. The Attendance page already displays session data and unfinished task counts.

## Options considered

1. **Server schedule with reconciliation (chosen).** The server closes shifts at the configured cutoff, and the same policy runs on relevant API requests and after a restart. This works while phones are offline and records an exact scheduled end time. It requires persisted schedule history and a shared server policy.
2. **Phone timer.** A local timer could hide tasks promptly but cannot reliably close shifts while the app is suspended, the phone is off, or the network is unavailable.
3. **Close on reconnect only.** Backdating to the cutoff is possible, but admins and dispatch would see a stale open shift until the rider reconnects.

## Schedule and time rules

- One global schedule applies to every rider. Store a Philippine-local start time, end time, and effective date for each revision; validate `00:00 <= start < end <= 23:59`. Overnight schedules are outside this version.
- The end time defaults to 19:00. An admin chooses the start time before the feature is enabled. Show the time zone (`Asia/Manila`, UTC+08:00) in the UI and API.
- A change saved on Philippine date D first applies on D+1. A persisted revision determines the schedule for each date, so later edits cannot alter historical cutoffs or backdated recovery.
- The start time is the earliest time a rider may go On Duty; it does not automatically create attendance or a shift. The end time is a hard cutoff. At or after it, no rider may open a shift, become available, or perform job actions until the next Philippine day and its start time.
- A rider may manually end and restart a shift **before** the cutoff under the existing multi-session behavior. A manual end after the cutoff cannot override a scheduled end that was due first.

## Server data and policy

- Persist schedule revisions and the admin actor/time of each change. Restrict writes to the existing `admin` role, validate times on the server, and record changes in the existing audit mechanism.
- Add a closure source to `shift_sessions` (manual versus scheduled) and persist the effective cutoff time used for scheduled closure. Preserve existing session history. Existing rows have manual or legacy source as appropriate.
- Centralize a `getShiftPolicy(riderId, now)` decision that returns the Philippine date, applicable schedule, whether starting/going On Duty/job actions are allowed, and the cutoff timestamp. All rider routes use the same decision rather than their own device or server-local clock calculations.
- A scheduled close uses the existing transactional rider lock. It closes an open session once, sets `end_time` to that date's configured cutoff, sets `users.is_on_duty` false, records the number of unfinished tasks and the fixed reason `Scheduled shift cutoff`, and updates the attendance row for **the session's date**. It does not change task assignments or delivery statuses. The scheduled closure bypasses the manual handover-reason requirement.
- A periodic server worker evaluates due cutoffs. The same reconciliation runs before rider shift/status/task access requests and on worker startup. This catches worker delays and server restarts. A deterministic operation key plus the existing row lock makes repeated runs safe; a manual end before cutoff wins without its timestamp being overwritten. If a due session is reconciled late, its stored end time is the scheduled cutoff, never the late processing time.
- Deny rider start/check-in-as-present, On Duty, and job mutation requests outside allowed hours. Deny rider access to active assignments after cutoff, including direct job detail requests and stale deep links. Completed/history records and admin access remain available. Server enforcement applies even when the client presents cached state or queued requests.
- Extend the existing rider shift-session response with the applicable schedule, server time, lock status, next allowed start time, and whether the last closure was scheduled. Do not rely on a second client request to decide whether task access is allowed.
- Dispatch treats cutoff riders as unavailable. An auto-closed in-progress or otherwise unfinished task stays assigned and visible to admins, with a durable review indicator. Admin notification can use existing event channels, but the review indicator cannot depend on a transient socket or push message.

## Web admin page

- Add **Shift Hours** under Settings in the desktop sidebar and mobile navigation. The page shows the current schedule, pending next-day revision, Philippine time zone, and when each revision takes effect.
- Admins can set the earliest On Duty time and automatic End shift time, review the effective date, and save. Reject invalid or overlapping times with a clear error. Saving cannot alter today's active schedule.
- Show a concise explanation: every open shift closes at the end time even with unfinished tasks; rider tasks become inaccessible until the next eligible day; admins retain them for follow-up.
- Show a link or summary for today's auto-closed riders with unfinished tasks in Attendance or Dispatch. Admins can inspect and reassign those tasks using the existing dispatch flow. There is no automatic reassignment.

## Rider experience

- Before cutoff, show a warning while the app is open; use existing notification delivery where available. This warning is best effort, while server closure is authoritative.
- At cutoff, refresh shift state, mark the rider Off Duty, hide Today, Upcoming, and Overdue assignment lists, and replace the On Duty action with the next eligible start time. Block job detail/actions reached through old navigation state.
- When offline, the app uses the last server-supplied schedule and Philippine clock only to hide controls and assignments promptly. It never creates a local authoritative shift end. On reconnect, it fetches and displays the server's scheduled closure without creating a second end request.
- If the schedule has never been fetched and the app is offline, fail closed for rider job actions and show that shift status needs a connection. A rider does not regain task access from cached On Duty state.
- The next day, an eligible rider explicitly taps On Duty; the app does not automatically start a new shift. Assignments still assigned to that rider become visible according to the existing task rules.

## Race and failure handling

- If a manual end commits before the cutoff, keep that actual end time. If a scheduled close commits first, later manual end retries return the closed state without changing its timestamp.
- If the server is down at cutoff, reconciliation closes due sessions on restart using the historical schedule revision and cutoff time. Do not create a second attendance row or shift session.
- On first activation, leave preexisting open sessions from dates without an applicable schedule unchanged and flag them for admin review. The new policy applies only from its first effective date forward; do not invent historical end times.
- If a rider goes offline before cutoff and uploads job changes afterward, the server applies the cutoff policy to the request. It rejects actions after cutoff and surfaces the affected job to admin review; client timestamps alone do not authorize a late action.
- Schedule save and cutoff worker operations must be transactionally safe under concurrent requests. Admins see any worker failure and due-but-open shifts until reconciliation succeeds.
- Notifications are sent only after the shift close commits. Missed notifications do not remove the durable admin review indicator.

## Acceptance criteria

1. Admin can save one global schedule, sees Philippine time and next-day effective date, and cannot save invalid times.
2. At cutoff, a shift with zero or many active tasks closes with the configured time, a scheduled source, and correct same-day attendance end; tasks and their statuses remain intact.
3. A rider cannot start or go On Duty before start time or at/after cutoff. An auto-ended rider cannot restart that day, even by calling the API directly.
4. After cutoff, Today, Upcoming, and Overdue assignments are hidden in the rider app; direct task reads and mutations are denied for that rider. Admins retain visibility and can act on unfinished tasks.
5. Cutoff succeeds without rider connectivity. Reconnect or server restart reconciles a missed close at the scheduled time and leaves one closure/event.
6. Manual end before cutoff keeps its actual timestamp; concurrent manual and scheduled closes never create conflicting records.
7. A schedule edit made today does not move today's cutoff or change historical session durations.
8. Admin Attendance or Dispatch shows which scheduled closures had unfinished tasks and provides a route to follow-up.

## Implementation sequence after design approval

1. Add persisted schedule revisions and shift closure metadata; define date/time and policy helpers.
2. Add transactional scheduled-close and reconciliation service, periodic worker, and request-time enforcement.
3. Add admin schedule API and Shift Hours page; surface unfinished cutoff tasks for admin review.
4. Add rider schedule/status response, cutoff screen state, assignment hiding, and locked actions.
5. Verify schedule revisions, boundary times, offline/restart recovery, races, task access, attendance date, and admin/rider flows; run the repository quality gate in its required order.

## Scope limits

This version uses one daily schedule for all riders. It does not create per-rider hours, overnight shifts, overtime overrides, automatic task reassignment, cancellation, or payroll rules. It does not modify historical sessions merely because a new schedule is saved.
