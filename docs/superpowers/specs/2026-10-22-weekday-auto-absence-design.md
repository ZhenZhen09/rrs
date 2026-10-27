# Weekday Automatic Absence and Late Check-In Approval

## Purpose

Automatically record a rider as absent when they do not check in within the configured grace period on a scheduled Monday–Friday workday, while allowing an administrator to authorize a late check-in without falsifying the rider's actual check-in time.

## Agreed behavior

- Use the effective shift schedule's start time and the `Asia/Manila` timezone.
- Apply the rule Monday through Friday only. Do not create automatic absences on Saturday or Sunday.
- At shift start, a rider without a check-in is shown as **Not checked in**; no absence is recorded yet.
- After a 15-minute grace period, record **Absent — automatic no-show** if the rider has not checked in and has no approved leave or applicable day off.
- Do not overwrite an existing attendance record or create duplicate automatic absences when the worker runs repeatedly.
- The rider remains off duty while absent. An automatic absence does not change the rider's duty status.
- An administrator can select **Approve late check-in** on an automatic absence. Approval authorizes the rider to check in but does not erase the absence or mark the rider present.
- On the rider's subsequent check-in, update the attendance to **Present — late**, preserve the actual check-in timestamp, and retain the original absence and approval details for audit. The rider remains off duty until they separately choose **On duty**.
- The admin attendance view identifies system-generated absences and shows the approving administrator and approval time after approval. Attendance updates are reflected in the rider app and admin view after the relevant server action succeeds.

## Scope and components

1. **Server-side absence reconciliation**
   - Extend the existing shift cutoff worker/reconciliation pattern to evaluate riders against the effective schedule.
   - Evaluate only dates that are weekdays in `Asia/Manila`, after the scheduled start plus 15 minutes.
   - Exclude riders with approved leave/day off and riders who already checked in.
   - Make processing idempotent so retries and multiple worker ticks cannot create duplicate absences.

2. **Attendance persistence and approval**
   - Store the automatic absence source and sufficient approval metadata to preserve who approved the late check-in and when.
   - Provide an authenticated, administrator-only action to approve late check-in for an automatically generated absence.
   - Permit the rider's normal check-in only when they have an active approval for that date; on check-in, mark them present-late and retain the audit history.
   - Reject duplicate or stale approvals safely and do not enable the rider to go on duty merely by approving or checking in.

3. **Admin attendance experience**
   - Display automatic no-shows distinctly from manual absences and pending check-ins.
   - Offer the late-check-in approval action only for eligible automatic absences.
   - Show approval state and audit details; do not silently delete or rewrite the historical absence.

4. **Rider experience and synchronization**
   - Explain that the rider needs administrator approval to check in after an automatic absence.
   - After approval, allow the rider to perform their normal check-in. Show late-present status only after the server records the check-in.
   - Keep duty status separate from attendance status.

## State flow

`Not checked in` (from shift start through grace period) → `Absent — automatic no-show` (after grace period) → `Late check-in approved` (admin action; still absent/off duty) → `Present — late` (rider check-in; still off duty) → `On duty` (rider's separate action).

Approved leave/day off and weekends do not enter this flow. A rider who checks in during the grace period follows the existing check-in flow and is not automatically absent.

## Failure handling and safety

- Worker restarts and retries must be safe and must not duplicate or overwrite attendance.
- Approval and check-in must be authorized server-side; the client cannot mark itself approved or present-late.
- If approval/check-in fails, retain the last server-confirmed state and show an actionable error rather than optimistic success.
- Restrict admin approval to the rider and work date represented by an eligible automatic absence; keep an audit record of the acting admin and timestamps.
- Preserve existing manual attendance and shift-session behavior except where the late approval explicitly enables the rider's check-in.

## Verification expectations

- Unit tests cover the 15-minute boundary, weekday/weekend behavior in `Asia/Manila`, approved leave/day-off exclusions, prior check-ins, idempotent worker retries, and shift schedule changes.
- Route/service tests cover administrator authorization, eligible/ineligible approvals, late check-in after approval, actual timestamp preservation, audit metadata, and unchanged off-duty status.
- Admin and rider UI tests cover the automatic-absence label, approval action, resulting state, and failure handling.
- Run the repository quality gate (lint, typecheck, tests, build) for affected packages. Do not use an emulator.

## Out of scope

- Changing the existing shift schedule configuration or defining custom workdays beyond Monday–Friday.
- Automatically setting a rider on duty.
- Automatically converting manual absences or existing historical attendance records.
- Silent admin deletion/undo of the automatic absence; approval and actual check-in are the supported correction path.
