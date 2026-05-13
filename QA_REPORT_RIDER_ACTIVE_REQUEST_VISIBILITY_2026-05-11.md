# QA Report: Rider Active Request Visibility

Date: 2026-05-11  
Scope: Personnel request creation, admin rider assignment, and rider visibility for active assigned requests.

## Executive Summary

Result: PASS with one web-side risk.

The current mobile rider flow should show active requests assigned by admin. The backend stores personnel-created requests, approves them by assigning `assigned_rider_id`, and exposes rider data only where `assigned_rider_id` matches the authenticated rider and `status = 'approved'`.

The prior bug class, where active requests disappeared because `delivery_date` was handled as a string/UTC date incorrectly, is mostly addressed in the mobile app. The backend normalizes response dates to `YYYY-MM-DD`, and the mobile rider tabs compare dates through `getLocalDateStr()` instead of directly constructing `new Date('YYYY-MM-DD')` for filtering.

## Code Areas Audited

- Backend request API: `server/routes/requests.ts`
- Backend request validation: `server/schemas/requestSchema.ts`
- Mobile rider task API: `mobile-app/services/apiService.ts`
- Mobile rider dashboard filters:
  - `mobile-app/app/(tabs)/index.tsx`
  - `mobile-app/app/(tabs)/tomorrow.tsx`
  - `mobile-app/app/(tabs)/overdue.tsx`
  - `mobile-app/app/(tabs)/history.tsx`
- Mobile date helpers: `mobile-app/utils/dateUtils.ts`
- Web rider dashboard date filtering: `src/app/pages/RiderDashboard.tsx`

## Flow Verification

### 1. Personnel Creates Request

Status: PASS

Evidence:

- `createRequestSchema` requires `delivery_date` as strict `YYYY-MM-DD`.
- `POST /api/requests` inserts the request with `status = 'submitted_waiting'` and `delivery_status = 'pending'`.
- Response formatting normalizes `delivery_date` to `YYYY-MM-DD`.

QA conclusion:

Personnel-created requests enter the system in a valid pending state and use a predictable date format.

### 2. Admin Assigns Request to Rider

Status: PASS

Evidence:

- `PUT /api/requests/:id/approve` sets:
  - `status = 'approved'`
  - `assigned_rider_id = rider_id`
  - `assigned_rider_name = riderName`
  - `delivery_status = 'assigned'`
- The route emits `new_assignment` to the rider room and `request-updated` globally.

QA conclusion:

Admin approval correctly converts the request into an active rider assignment.

### 3. Rider API Visibility

Status: PASS

Evidence:

- `GET /api/requests` enforces rider data isolation:
  - `assigned_rider_id = authenticated rider id`
  - `status = 'approved'`
- The route returns formatted request rows, including normalized `delivery_date`.

QA conclusion:

A rider should receive only their own approved requests. Active requests are not filtered out by date at the backend list endpoint.

### 4. Mobile Rider Active Tabs

Status: PASS

Evidence:

- Today tab filters by:
  - `getLocalDateStr(req.delivery_date) === todayStr`
  - `status === 'approved'`
  - non-terminal `delivery_status`
- Overdue tab filters by:
  - `getLocalDateStr(req.delivery_date) < todayStr`
  - `status === 'approved'`
  - non-terminal `delivery_status`
- Tomorrow tab filters by:
  - `getLocalDateStr(req.delivery_date) === tomorrowStr`
  - non-terminal `delivery_status`
- `mobile-app/utils/dateUtils.ts` preserves strict `YYYY-MM-DD` strings as-is and parses bare date strings as local dates.

QA conclusion:

The mobile app avoids the old `new Date('YYYY-MM-DD')` UTC shift bug for active rider tabs. Requests scheduled for today, tomorrow, or past dates should appear in the correct rider tab after assignment.

## Findings

### Finding 1: Web Rider Dashboard Still Has Date Shift Risk

Severity: Medium  
Status: Open

`src/app/pages/RiderDashboard.tsx` still uses:

```ts
getLocalDateStr(new Date(req.delivery_date))
```

For bare `YYYY-MM-DD` values, JavaScript parses the value as UTC. In time zones ahead of UTC, this can shift the date backward locally and cause today/tomorrow filtering to miss active assigned requests.

Recommendation:

Change the web rider dashboard to parse local date strings directly, for example:

```ts
getLocalDateStr(parseLocalDate(req.delivery_date))
```

or update the web `getLocalDateStr` helper to accept `string | Date` like the mobile helper and call:

```ts
getLocalDateStr(req.delivery_date)
```

### Finding 2: Tomorrow Mobile Tab Relies on Backend Approved Filter

Severity: Low  
Status: Watch

The mobile Tomorrow tab does not explicitly check `req.status === 'approved'`. This is currently protected by the rider backend endpoint, which already returns only approved rider-assigned requests.

Recommendation:

For defense in depth and consistency with Today/Overdue, add:

```ts
const isApproved = req.status === 'approved';
return isTomorrow && isApproved && isActive;
```

## Regression Test Cases

### Test Case 1: Same-Day Assignment Appears in Rider Today

Steps:

1. Personnel creates request with `delivery_date` equal to local today.
2. Admin approves and assigns it to Rider A.
3. Rider A opens mobile Today tab.

Expected:

- Request appears in Today.
- Request has `status = approved`.
- Request has `delivery_status = assigned` or `in_progress`.

### Test Case 2: Tomorrow Assignment Appears in Rider Tomorrow

Steps:

1. Personnel creates request with `delivery_date` equal to local tomorrow.
2. Admin assigns it to Rider A.
3. Rider A opens mobile Tomorrow tab.

Expected:

- Request appears in Tomorrow.
- Request does not appear in Today or Overdue.

### Test Case 3: Past Active Assignment Appears in Overdue

Steps:

1. Create or seed an approved request assigned to Rider A with `delivery_date` before local today.
2. Keep `delivery_status = assigned` or `in_progress`.
3. Rider A opens mobile Overdue tab.

Expected:

- Request appears in Overdue.
- Request does not move to History until terminal status.

### Test Case 4: Terminal Request Does Not Appear in Active Tabs

Steps:

1. Assign a request to Rider A.
2. Rider marks it `completed` or `failed`.
3. Rider refreshes Today/Tomorrow/Overdue.

Expected:

- Request disappears from active tabs.
- Request appears in History.

### Test Case 5: Wrong Rider Cannot See Assignment

Steps:

1. Assign a request to Rider A.
2. Log in as Rider B.
3. Call or refresh the rider task list.

Expected:

- Rider B does not receive Rider A's request.
- Direct request detail access should be forbidden unless authorized.

## Final QA Verdict

Mobile rider active visibility is acceptable for the audited flow. The old date-string issue is addressed in the mobile app by local date normalization and backend response formatting.

Before calling the whole system fully cleared, fix or regression-test the web rider dashboard date comparison because it still contains the old risky pattern.
