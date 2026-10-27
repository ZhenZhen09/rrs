# Personnel and Admin Web Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in browser push for Personnel/V2 and Admin for the approved role-specific events, with durable per-device delivery and safe request navigation.

**Architecture:** Keep `notifications` as the complete in-app history and enqueue only eligible saved notifications after their transaction commits. A shared durable dispatcher sends each eligible notification to each recipient subscription, tracking endpoint-level success and retry state; the existing Expo path remains rider-only. Personnel and Admin settings use the existing Web Push API helpers, while the service worker validates same-origin click destinations.

**Tech Stack:** TypeScript, Express, MySQL, Socket.IO, React, Vite PWA, Web Push API, `web-push`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-personnel-admin-web-push-design.md`

## Global Constraints

- Personnel events: request approval, decline, revision request, and cancellation.
- Admin events: new request submissions and dispatch issues, including assignment cancellations and rider deviation requests.
- Request permission only in the explicit Enable button handler; never on page load.
- The in-app inbox remains the complete history and works when browser push is unavailable, denied, or unconfigured.
- Riders receive no web push; preserve their existing Expo path and configuration.
- Do not sync preferences across devices or add event categories beyond the approved allowlist.
- Do not expose subscription endpoints, encryption keys, or VAPID private keys in logs or client-visible responses.
- Push payloads contain concise copy, the existing request ID, and a same-origin route appropriate to the recipient role; omit sensitive request details.
- Retry transient provider/network errors with bounded backoff; remove endpoints returning 404/410; push failures must not fail or roll back the in-app notification.
- No Git commit or push is requested.

## Review Focus

- **Duplicate queueing or worker restart:** notification/device work must remain unique and successfully sent endpoints must not receive another push; test repeated enqueue and dispatcher restart/retry.
- **Role or event mismatch:** test every approved event/role pair and representative disallowed pairs, including rider recipients.
- **Denied, unsupported, or unconfigured browser:** show an accurate state, do not re-prompt automatically, and preserve inbox access.
- **Subscription ownership and sensitive data:** test cross-account deletion/status isolation, non-staff registration denial, and responses/logs that omit endpoint keys.
- **Malformed or off-origin click URL:** service worker must fall back to the correct role home/request destination without navigating off-origin.

---

### Task 1: Add a durable role-filtered web-push queue and dispatcher

**Files:**
- Modify: `server/services/webPush.ts`
- Create: `server/services/webPushQueue.ts`
- Create: `server/services/__tests__/webPushQueue.test.ts`
- Create: `server/services/__tests__/webPushDispatcher.test.ts`

**Interfaces:**
- `isEligibleWebPush(role: string, type: string): boolean` owns the centralized allowlist. Use the persisted notification type values: Admin `request_submitted`, `assignment_cancelled`, `deviation_requested`; Personnel `request_approved`, `request_disapproved`, `request_revision`, `request_cancelled`.
- `enqueueWebPush(notificationId: string): Promise<void>` reads the already-persisted notification and recipient role and inserts durable eligible work. Ineligible events and rider recipients create no work.
- Queue rows are unique by notification ID. Device delivery rows are unique by notification ID and endpoint hash and track `pending`/`sent`, attempt count, next attempt time, and last safe error code.
- `dispatchPendingWebPushBatch()` claims due work safely across concurrent workers, sends concise role-aware payloads, marks success per endpoint, schedules bounded retries for transient failures, and removes 404/410 subscriptions.

- [ ] **Step 1: Add failing allowlist and enqueue tests**

```ts
it('allows only the approved role and event combinations', () => {
  expect(isEligibleWebPush('admin', 'request_submitted')).toBe(true);
  expect(isEligibleWebPush('personnel', 'request_approved')).toBe(true);
  expect(isEligibleWebPush('rider', 'request_approved')).toBe(false);
  expect(isEligibleWebPush('admin', 'request_approved')).toBe(false);
  expect(isEligibleWebPush('personnel', 'deviation_requested')).toBe(false);
});
```

Add enqueue tests that assert ineligible notifications create no rows and repeated enqueue for an eligible notification remains unique.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npx vitest run server/services/__tests__/webPushQueue.test.ts server/services/__tests__/webPushDispatcher.test.ts`

Expected: the new service modules or contracts are missing.

- [ ] **Step 3: Implement durable queue and delivery tables**

Extend `ensureWebPushTable()` or add a sibling initializer to create an eligible notification work table and an endpoint delivery table with unique keys for notification ID and `(notification ID, endpoint hash)`. Include due-time/attempt fields and indexes for batch claiming. Use the project’s existing MySQL schema and query patterns. Do not store raw endpoints or encryption keys in queue rows.

- [ ] **Step 4: Implement centralized eligibility and idempotent enqueue**

Load the saved notification and recipient role from the database, apply `isEligibleWebPush`, and insert work with a uniqueness constraint. Resolve the destination role from the persisted recipient account rather than accepting a role from request payloads. Keep the notification row untouched when it is not eligible or push is unconfigured.

- [ ] **Step 5: Implement safe per-device dispatch, dedupe, and retry**

For each work item, snapshot/insert pending endpoint delivery rows using endpoint hashes, then send only unsent due rows. On success mark sent. On a transient failure increment attempts and set bounded exponential backoff; on 404/410 delete the matching user-owned subscription and finish that endpoint. Catch delivery errors so enqueue/dispatch cannot propagate into the already-completed business transaction. Ensure worker claiming prevents concurrent instances from sending the same pending row simultaneously.

- [ ] **Step 6: Run focused queue and dispatcher tests**

Run: `npx vitest run server/services/__tests__/webPushQueue.test.ts server/services/__tests__/webPushDispatcher.test.ts`

Expected: eligibility, duplicate enqueue, retry, endpoint cleanup, and per-device idempotency tests pass.

### Task 2: Publish saved request notifications into the queue after commit

**Files:**
- Modify: `server/services/deliveryNotifications.ts`
- Modify: `server/routes/requests.ts`
- Modify: `server/routes/notifications.ts`
- Modify: `server/index.ts` or the existing request watchdog module that persists notification rows
- Test: `server/services/__tests__/deliveryNotifications.test.ts`
- Create: `server/services/__tests__/webPushEventCoverage.test.ts`

**Interfaces:**
- Extend `publishDeliveryNotification(io, notification, options?)` to enqueue the saved notification ID after persistence/commit without changing socket event or Expo sender contracts.
- Notification creation sites that do not use `publishDeliveryNotification` must call the same publisher after their transaction commits.
- The queue dispatcher starts only after its tables are initialized. The disabled in-memory cursor worker must not be re-enabled.

- [ ] **Step 1: Add failing tests for eligible event publication and rider exclusion**

```ts
it('queues the saved notification id after publish without creating a second inbox row', async () => {
  const enqueue = vi.fn().mockResolvedValue(undefined);
  await publishDeliveryNotification(io, notification, { enqueueWebPush: enqueue });
  expect(enqueue).toHaveBeenCalledWith(notification.id);
  expect(executor.query).not.toHaveBeenCalled();
});
```

Add event coverage for submission, approval, decline, revision, cancellation, assignment cancellation, and deviation paths, including the watchdog producer. Assert rider notification paths still invoke only Expo and do not queue web push.

- [ ] **Step 2: Run focused publisher and event coverage tests**

Run: `npx vitest run server/services/__tests__/deliveryNotifications.test.ts server/services/__tests__/webPushEventCoverage.test.ts`

Expected: new queue publication assertions fail at uncovered producers.

- [ ] **Step 3: Publish eligible IDs only after persistence commits**

Use the shared publisher at each producer. For transaction-backed request paths, schedule publication only after commit; preserve each existing in-app row, ID, Socket.IO event, and notification type. For direct inserts, invoke the shared publisher after the insert resolves. Do not pass web push through `sendPushNotification`, which remains the Expo sender.

- [ ] **Step 4: Initialize and start the durable dispatcher**

Replace the no-op startup with queue table initialization and a bounded dispatcher loop. Handle initialization or provider failures without taking down server startup or request routes. Ensure only one scheduling loop starts per server process and rely on database claiming for multi-instance safety.

- [ ] **Step 5: Run focused publisher, producer, and Expo regression tests**

Run: `npx vitest run server/services/__tests__/deliveryNotifications.test.ts server/services/__tests__/webPushQueue.test.ts server/services/__tests__/webPushDispatcher.test.ts server/services/__tests__/webPushEventCoverage.test.ts server/routes/__tests__/notifications-security.test.ts`

Expected: all approved event sources queue once after commit, non-eligible/rider notifications do not queue, and Expo behavior remains unchanged.

### Task 3: Secure staff subscription APIs and provide explicit browser status

**Files:**
- Modify: `server/routes/notifications.ts`
- Modify: `server/services/webPush.ts`
- Create: `server/routes/__tests__/web-push-subscriptions.test.ts`

**Interfaces:**
- `/web-push/config` exposes only enabled state and the public VAPID key.
- Status, subscribe, and delete accept authenticated Admin/Personnel accounts only; status/deletion remain scoped to `req.user.id`.
- Subscribe remains idempotent for one browser endpoint and binds ownership to the signed-in account. Never return the endpoint or encryption keys.

- [ ] **Step 1: Add failing route tests for role authorization and ownership**

Test Admin and Personnel success, rider/other-role rejection, unauthenticated rejection, endpoint reuse behavior, status isolation, and attempts to delete another account’s endpoint. Assert response bodies never include endpoint, `p256dh`, or `auth` values.

- [ ] **Step 2: Run the focused API tests and confirm they fail**

Run: `npx vitest run server/routes/__tests__/web-push-subscriptions.test.ts`

Expected: the current staff-role restrictions are absent.

- [ ] **Step 3: Enforce staff roles and retain account-scoped subscription operations**

Apply role checks to all staff Web Push operations, validate endpoint/key fields and bounded lengths, preserve the authenticated account binding, and use endpoint hashes for deletion. Keep logs limited to safe error metadata; do not log request bodies or subscription records.

- [ ] **Step 4: Run subscription and existing notification security tests**

Run: `npx vitest run server/routes/__tests__/web-push-subscriptions.test.ts server/routes/__tests__/notifications-security.test.ts`

Expected: only Admin/Personnel can operate staff subscriptions, and existing inbox/Expo access behavior remains intact.

### Task 4: Add browser push controls to Personnel and Admin settings

**Files:**
- Modify: `src/app/utils/webPush.ts`
- Modify: `src/app/personnel-v2/PersonnelV2Page.tsx`
- Modify: `src/app/pages/Admin/AdminLayout.tsx`
- Create: `src/app/components/WebPushSettings.tsx`
- Create: `src/app/utils/__tests__/webPush.test.ts`
- Create: `src/app/personnel-v2/__tests__/webPushPreferences.test.tsx`
- Create: `src/app/pages/Admin/__tests__/adminWebPushSettings.test.tsx`

**Interfaces:**
- Keep `getWebPushStatus`, `enableWebPush`, and `disableWebPush` as the shared client API; extend the status model only as needed to distinguish unsupported, denied, unconfigured, and subscribed states.
- Both controls use the authenticated fetch implementation and refresh status after enable/disable.
- `Notification.requestPermission()` is called only within the explicit Enable action handler. Do not prompt from mount effects.

- [ ] **Step 1: Add failing client and component tests**

Test unsupported APIs, denied permission, missing VAPID config, already-subscribed re-enable without duplicate subscription, successful disable, status refresh, and that rendering/mounting settings never calls `requestPermission()`.

- [ ] **Step 2: Run focused client/component tests and confirm they fail**

Run: `npx vitest run src/app/utils/__tests__/webPush.test.ts src/app/personnel-v2/__tests__/webPushPreferences.test.tsx src/app/pages/Admin/__tests__/adminWebPushSettings.test.tsx`

Expected: current settings have no controls or detailed status states.

- [ ] **Step 3: Implement explicit enable/disable status behavior**

Feature-detect service worker, Push API, and Notification API; show unsupported, permission denied, server unconfigured, and this-device subscribed states. Keep the inbox available in each state. Reuse any existing browser subscription on enable; after the authenticated subscribe request succeeds, display subscribed status. Disable removes the authenticated server record and unsubscribes this browser subscription. Explain that OS/browser settings can revoke permission.

- [ ] **Step 4: Add Personnel Preferences control**

Add a clearly labeled Browser notifications section to `PreferencesPanel`. Load status without prompting, present Enable/Disable based on state, and show errors/status accessibly. Keep the existing installation and account actions.

- [ ] **Step 5: Add discoverable Admin control**

Add an equivalent Browser notifications section to the existing Admin Profile dialog in `AdminLayout.tsx`. Render the shared `WebPushSettings` component from both Admin and Personnel surfaces so status, enable/disable, and error behavior stay consistent; keep role-specific surrounding layout in each page.

- [ ] **Step 6: Run focused web-push UI tests**

Run the command from Step 2.

Expected: both role surfaces expose the same state and explicit opt-in behavior with no prompt on load.

### Task 5: Make service-worker display and request navigation safe and role-aware

**Files:**
- Modify: `public/push-sw.js`
- Modify: `server/services/webPushQueue.ts`
- Test: `server/services/__tests__/webPushDispatcher.test.ts`
- Create: `tests/unit/web-push-service-worker.test.ts` (or the repository’s existing service-worker test location)

**Interfaces:**
- Payload includes stable notification ID/tag, request ID, concise title/body, and an allowlisted same-origin path for the recipient role.
- Admin request clicks route to the Admin request/dispatch view; Personnel clicks route to Personnel/V2 and select/open the request ID.
- Service worker validates the target as a same-origin path before navigation and uses a safe role-home fallback.

- [ ] **Step 1: Add failing payload and service-worker navigation tests**

Assert role-specific request URLs, stable notification identifiers, no sensitive request fields, rejection of absolute/external/protocol-relative URLs, and safe fallback for malformed paths. Verify existing client focus/open behavior for valid same-origin paths.

- [ ] **Step 2: Run focused dispatcher and service-worker tests**

Run: `npx vitest run server/services/__tests__/webPushDispatcher.test.ts tests/unit/web-push-service-worker.test.ts`

Expected: role-specific destinations or origin validation are absent.

- [ ] **Step 3: Build concise, stable role-aware payloads**

Generate a title/body from approved event types without embedding request message details, requester contact data, or other sensitive fields. Include the saved notification ID as the stable tag/identifier and request ID as a separate data field. Produce only role-appropriate same-origin paths.

- [ ] **Step 4: Validate service-worker click paths and focus matching windows**

Resolve candidate paths against the service-worker origin; reject paths whose resolved origin differs or that contain unsafe schemes. Navigate/focus an existing same-origin client or open a new same-origin window. Keep display immediate and replace duplicates using the stable notification ID.

- [ ] **Step 5: Run focused payload and navigation tests**

Run the command from Step 2.

Expected: all role routes are correct, duplicate display keys are stable, and off-origin targets never navigate.

### Task 6: Verify browser support, role filtering, retries, and existing notification paths

**Files:**
- Verify: Tasks 1–5
- Manual verification: Android Chrome, supported iOS/iPadOS Home Screen web app, and desktop browser

- [ ] **Step 1: Verify device opt-in and opt-out**

With valid VAPID keys, enable on one browser, reload and confirm subscribed status, disable, then enable again. Confirm one endpoint record exists and permission is requested only from the Enable action.

- [ ] **Step 2: Verify unsupported, denied, and unconfigured states**

Exercise an unsupported browser, denied permission, and missing/invalid VAPID configuration. Confirm a clear status is shown, no repeated permission prompt occurs, and the in-app inbox continues to work.

- [ ] **Step 3: Verify role/event delivery matrix**

Create each approved Admin and Personnel event and representative disallowed events. Confirm each eligible user/device receives one push, ineligible events remain inbox-only, and riders receive no web push.

- [ ] **Step 4: Verify durability and stale endpoint cleanup**

Cause a transient provider failure, restart the dispatcher, and confirm retry succeeds without resending already successful device deliveries. Simulate 404/410 and confirm the stale subscription is deleted. Confirm a failed push does not fail the request or remove its inbox row.

- [ ] **Step 5: Verify role-specific clicks and platform regression**

Click an Admin push and a Personnel push and confirm each opens the associated request in the correct area. Confirm malformed/external targets stay on-origin. Verify supported iOS/iPadOS Home Screen behavior and desktop browser behavior; do not claim ordinary iOS Safari-tab support.

- [ ] **Step 6: Verify Expo rider push and complete inbox history**

Exercise existing Expo rider notification flows and confirm their payloads/behavior are unchanged. Confirm every notification type still appears in the in-app inbox regardless of Web Push eligibility.

- [ ] **Step 7: Run the repository quality gate after focused tests pass**

Use the `quality-gate` skill and run applicable checks in this order: lint, typecheck, test, build. Stop on failures, fix them, and rerun the full sequence. Run frontend and server checks from their respective package scripts; run the focused tests from the earlier tasks as part of the test stage.
