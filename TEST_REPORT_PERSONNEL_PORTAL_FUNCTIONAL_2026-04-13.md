# Personnel Portal Functional Test Execution Report

Date: 2026-04-13

Environment:

- Repo: `rider-scheduling-system`
- Frontend server: `npm run dev:frontend -- --host 127.0.0.1`
- Playwright command: `npx playwright test tests/personnel-portal-functional.spec.ts`
- Browser: Chromium

## Execution Summary

- Total tests executed: 11
- Passed: 2
- Failed: 9
- Overall result: Failed

## Passed Cases

1. `PTC-AUTH-001` blocks unauthenticated access to the personnel dashboard
2. `PTC-AUTH-002` shows an error for invalid credentials

## Failed Cases

1. `PTC-DASH-001` renders the personnel dashboard, active cards, and metrics
2. `PTC-REQ-001` enforces required fields before opening the submit confirmation
3. `PTC-REQ-002` fetches slot availability after date selection
4. `PTC-REQ-003` accepts pickup and drop-off data from the map picker message contract
5. `PTC-REQ-004` submits a new request after confirmation
6. `PTC-REQ-005` supports revision resubmission flow
7. `PTC-HIST-001` filters history records and opens status logs
8. `PTC-NOTIF-001` displays notifications and allows mark-all-read
9. `PTC-PROFILE-001` opens profile details and supports logout

## Findings

### 1. Quick-start onboarding modal blocks most personnel interactions

Observed from Playwright failure snapshots:

- A modal titled `Welcome, Department Personnel!` is displayed on dashboard load.
- It overlays the personnel page and likely intercepts clicks on:
  - `New Delivery Request`
  - `Action Required`
  - `History`
  - notifications access

Impact:

- This caused repeated 30-second timeouts in request, revision, and history scenarios.
- The portal is functionally present underneath, but first-load automation and possibly real first-time user flows are blocked until the modal is dismissed.

Affected tests:

- `PTC-REQ-001`
- `PTC-REQ-002`
- `PTC-REQ-003`
- `PTC-REQ-004`
- `PTC-REQ-005`
- `PTC-HIST-001`
- likely contributed to `PTC-NOTIF-001`

### 2. Notification test used a weak selector

Observed:

- The test clicked the first icon-only button in the header.
- The report does not prove the notification drawer actually opened.

Impact:

- `PTC-NOTIF-001` is currently inconclusive as an app defect.
- This is more likely a test-selector problem than a portal failure.

### 3. Profile test failed due to ambiguous text selector

Observed:

- `getByText('John HR')` matched both:
  - the header account menu text
  - the dashboard welcome text

Impact:

- `PTC-PROFILE-001` failed because of test strict-mode ambiguity, not a confirmed application bug.

### 4. Dashboard test assertion for `Track` was unstable

Observed:

- Failure said `Track` button was not found.
- The error snapshot still showed a visible `Track` button on the page.

Impact:

- `PTC-DASH-001` looks flaky or timing-related rather than a confirmed portal defect.
- The onboarding modal may be interfering with focus/accessibility timing.

## Root Cause Assessment

There are two categories of failure:

1. Application/UI behavior issue
- The quick-start modal blocks primary functional interactions on load.

2. Test implementation issues
- notification selector is too broad
- profile selector is ambiguous
- at least one dashboard assertion is timing-sensitive

## Recommendation

### App-side

- Make the quick-start modal dismissible in a deterministic way for first-load flows.
- Persist dismissal state clearly and avoid blocking core navigation/actions after initial display.

### Test-side

- Dismiss the quick-start modal before continuing with personnel functional flows.
- Use targeted selectors for:
  - notification bell
  - account menu trigger
  - dialog open states
- Replace ambiguous text-only selectors with role-based or scoped locators.

## Artifact Locations

- Spec: [tests/personnel-portal-functional.spec.ts](/C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/tests/personnel-portal-functional.spec.ts)
- Test design: [guidelines/personnel-portal-functional-test-cases.md](/C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/guidelines/personnel-portal-functional-test-cases.md)
- Playwright result artifacts: `test-results/`

## Command Output Summary

```text
Running 11 tests using 4 workers
2 passed
9 failed
```
