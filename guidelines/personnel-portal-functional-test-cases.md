# Personnel Portal Functional Test Cases

## Scope

This suite covers the personnel-facing web portal in the Rider Scheduling System:

- authentication and session handling
- route authorization
- personnel dashboard rendering
- request creation, validation, confirmation, submission, and cancellation window
- revision and resubmission workflow
- notifications, profile, and logout
- history search, pagination intent, and audit-log viewing
- map picker handoff contract

## Assumptions

- Base URL for Playwright is `http://127.0.0.1:5173` unless `BASE_URL` is set.
- Backend APIs may be mocked for deterministic functional testing.
- Demo personnel account can be seeded via browser storage:
  `john.hr@company.com`
- MFA-specific flows exist in login, but the current automated personnel portal suite focuses on the post-authenticated portal plus core login error handling. MFA setup and verify cases are listed below for manual or future automated expansion.

## Functional Test Matrix

| ID | Area | Test case | Preconditions | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| PTC-AUTH-001 | Access control | Unauthenticated user opens `/personnel/dashboard` | No active session | Navigate directly to the route | User is redirected to `/` and login screen is shown |
| PTC-AUTH-002 | Authentication | Invalid login credentials | Login page loaded | Enter invalid email/password, submit | Error banner shows `Invalid credentials` and user stays on login page |
| PTC-AUTH-003 | Authentication | Successful personnel login | Valid personnel credentials, backend reachable | Enter valid credentials and submit | User lands on `/personnel/dashboard` |
| PTC-AUTH-004 | Authentication | Personnel account requiring password reset | Test user has `require_password_reset = 1` | Submit valid credentials | Password-reset prompt is triggered and login is blocked until password is updated |
| PTC-AUTH-005 | MFA | Personnel account without MFA in non-development mode | Non-dev environment, personnel user without MFA | Submit valid credentials | MFA setup flow opens with QR code and 6-digit verification input |
| PTC-AUTH-006 | MFA | Personnel account with MFA enabled | Non-dev environment, MFA-enabled personnel user | Submit valid credentials, enter valid OTP | User completes MFA and enters portal |
| PTC-AUTH-007 | Authorization | Non-personnel user opens personnel route | Logged in as `admin` or `rider` | Navigate to `/personnel/dashboard` | User is redirected to their own role dashboard |
| PTC-DASH-001 | Dashboard | Personnel dashboard loads summary content | Active personnel session | Open dashboard | Header, metrics, active tab set, and personnel-specific widgets are visible |
| PTC-DASH-002 | Dashboard | Empty-state rendering for no active tasks | Session active, no active requests | Open dashboard | Empty active-task state is shown without crash |
| PTC-REQ-001 | Request form | Required-field validation before submission | Dashboard loaded | Open new request dialog, click `Confirm and Submit Request` without data | Toast shows required-field validation and confirmation dialog does not open |
| PTC-REQ-002 | Scheduling | Slot availability fetch on date change | Dashboard loaded | Pick a delivery date | Availability request fires and slot statuses display as Available, Busy, or Full |
| PTC-REQ-003 | Scheduling | Full slots are not selectable | Availability API returns a slot with `count >= 5` | Open slot selector | Full slot appears disabled |
| PTC-REQ-004 | Map integration | Pickup location is populated from map picker message | New request dialog open | Dispatch `MAP_LOCATION_SELECTED` with `pickerType=pickup` | Pickup address and business details update in form |
| PTC-REQ-005 | Map integration | Drop-off location is populated from map picker message | New request dialog open | Dispatch `MAP_LOCATION_SELECTED` with `pickerType=dropoff` | Destination address and landmark details update in form |
| PTC-REQ-006 | Submission | New request submits after confirmation | Required fields completed | Submit form, confirm modal, click `Yes, Submit` | Success toast appears, dialog closes, optimistic request shows queueing state |
| PTC-REQ-007 | Submission | Duplicate submit is blocked while request is processing | Required fields completed | Double-click final submit button | Only one submission is sent |
| PTC-REQ-008 | Cancellation window | Submitted request can be cancelled within queueing window | Freshly submitted request in `submitted_waiting` | Click `Cancel Now`, confirm browser dialog | Request is cancelled and removed from active queue |
| PTC-REQ-009 | Cancellation window | Cancellation is blocked after queueing window expires | Request status no longer `submitted_waiting` | Call cancel endpoint or try via UI after timeout | User cannot cancel and backend returns validation error |
| PTC-REQ-010 | Error handling | Request submission failure rolls back optimistic state | Force POST `/api/requests` failure | Submit valid request | Error feedback is shown and optimistic entry is removed |
| PTC-REV-001 | Revision flow | Returned request is shown under `Action Required` | Request status is `returned_for_revision` | Open dashboard | Revision tab is visible with badge count |
| PTC-REV-002 | Revision flow | Admin feedback is visible on returned request | Returned request exists | Open `Action Required` tab | Admin remark is displayed |
| PTC-REV-003 | Revision flow | Edit and resubmit corrected request | Returned request exists | Open revision card, edit details, resubmit, confirm | Success toast appears and request returns to queueing/review flow |
| PTC-ACT-001 | Active tasks | Active request card shows assigned rider and progress | Approved or in-progress request exists | Open active tab | Rider name, schedule, type badge, and progress stepper are visible |
| PTC-ACT-002 | Active tasks | Track button opens live tracking when delivery is in progress | Request delivery status is `in_progress` | Click `Track` | Live tracking route opens in new tab/window |
| PTC-ACT-003 | Active tasks | Queueing countdown is visible for fresh submission | Request status is `submitted_waiting` | Open active tab | Countdown strip with `Cancel Now` is shown |
| PTC-HIST-001 | History | History tab shows terminal requests only | Completed, failed, disapproved, or cancelled requests exist | Open history tab | Only history-eligible requests appear |
| PTC-HIST-002 | History | Search filters by recipient name | History records exist | Search by recipient keyword | Matching rows remain visible |
| PTC-HIST-003 | History | Search filters by drop-off address | History records exist | Search by address keyword | Matching rows remain visible |
| PTC-HIST-004 | History | Pagination changes visible records | More history rows than page size | Move between pages | Display range and rows update correctly |
| PTC-HIST-005 | Audit trail | Status logs modal shows ordered history | History row exists and status log endpoint returns data | Click `Logs` | Status log modal opens with descending timestamps and remarks |
| PTC-HIST-006 | Audit trail | Empty status logs state is handled | Status log endpoint returns empty array | Click `Logs` | Empty-state message appears without UI failure |
| PTC-NOTIF-001 | Notifications | Unread notification count is shown | Unread notifications exist | Open dashboard | Bell badge reflects unread count |
| PTC-NOTIF-002 | Notifications | Notification drawer lists personnel notifications | Notifications exist for current user | Open notification sheet | Notifications are visible with timestamp and message |
| PTC-NOTIF-003 | Notifications | Clicking a notification marks it read and navigates context | Notification tied to a request exists | Click notification row | Notification is marked read, drawer closes, related request is highlighted if present |
| PTC-NOTIF-004 | Notifications | Mark all notifications as read | Unread notifications exist | Click `Mark all read` | Unread state clears and badge resets |
| PTC-PROFILE-001 | Profile | User profile dialog shows account details | Logged in as personnel | Open profile dialog | Name, email, role, and department are shown |
| PTC-PROFILE-002 | Session | Logout clears session and returns to login | Logged in as personnel | Use logout action | User returns to `/` and storage session is cleared |
| PTC-ERR-001 | Resilience | Requests API failure does not crash dashboard | Force GET `/api/requests` failure | Open dashboard | Page shell still renders and app remains usable |
| PTC-ERR-002 | Resilience | Notifications API failure does not crash dashboard | Force GET `/api/notifications` failure | Open dashboard and open notification sheet | UI remains stable and sheet does not crash |
| PTC-ERR-003 | Resilience | Status history fetch failure shows toast | Force GET `/status-history` failure | Click `Logs` | Error toast appears |

## Automated Coverage Added

The initial Playwright automation scaffold is in [tests/personnel-portal-functional.spec.ts](/C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/tests/personnel-portal-functional.spec.ts) and currently covers:

- unauthenticated route protection
- invalid login handling
- dashboard render for personnel user
- request form validation
- availability lookup
- map message contract for pickup and drop-off
- submit-confirm flow
- revision resubmission
- history filtering and status logs
- notifications
- profile and logout

## Execution

Use these commands from the repo root:

```bash
npx playwright test tests/personnel-portal-functional.spec.ts
```

If the app is not running on the default Vite port:

```bash
BASE_URL=http://127.0.0.1:3000 npx playwright test tests/personnel-portal-functional.spec.ts
```
