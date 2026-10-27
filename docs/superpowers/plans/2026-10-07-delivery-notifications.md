# Delivery Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver consistent, low-noise delivery notifications to Personnel/V2 and Admin web inboxes and the rider's mobile inbox/push, while preserving existing delivery IDs and payload fields.

**Architecture:** Keep the existing `notifications` table as the durable in-app history. Add a small server delivery-notification boundary that creates recipient records and dispatches socket/Expo delivery after persistence; web clients remain in-app only. Centralize Expo registration/listeners in the mobile root and add an Android-gated notification presenter for channels, task routing/actions, and one active-delivery notification.

**Tech Stack:** Express/TypeScript, MySQL, Socket.IO, React/Vite/Sonner, Expo SDK 57, `expo-notifications`, Expo Router, Expo Linking, Jest/Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-delivery-notification-experience-design.md`

## Global Constraints

- Preserve `request_id`, existing notification IDs, and existing backend payload fields; only add optional fields.
- Personnel/V2 and web Admin use in-app notifications only; rider mobile receives in-app and push notifications.
- Do not push an alert to the rider for a status action the rider just performed.
- Send one overdue alert at the overdue transition and at most one follow-up after two hours; stop when the task is no longer overdue or terminal.
- Use Android channels `delivery_updates` and `delivery_urgent`; gate Android-only behavior and preserve iOS notifications.
- Do not add Notifee or another native dependency without reporting the Expo limitation and receiving a design decision.
- Keep routine location changes out of the notification stream.
- Do not rewrite unrelated code or overwrite pre-existing workspace changes.

## Review Focus

- **Missing optional route/contact data:** omit the unavailable map/call action and keep task navigation available.
- **Denied notification permission:** keep in-app notifications and do not repeatedly prompt.
- **Duplicate event delivery or worker restart:** create the durable row and overdue follow-up at most once per recipient/event.
- **Stale/missing ETA or progress:** omit stale values and never display a fabricated progress percentage.
- **Android/iOS differences:** use Android channels/actions/sticky behavior only on Android and retain the current iOS notification path.

---

### Task 1: Centralize delivery event notification persistence and routing

**Files:**
- Create: `server/services/deliveryNotifications.ts`
- Modify: `server/routes/requests.ts`
- Modify: `server/routes/notifications.ts`
- Modify: `server/services/proactiveOverdue.ts`
- Test: `server/services/__tests__/deliveryNotifications.test.ts`
- Test: `server/services/__tests__/proactiveOverduePush.test.ts`

**Interfaces:**
- `persistDeliveryNotification(executor, input)` inserts one `notifications` row and returns `{ id, user_id, message, type, request_id }`. The executor accepts the existing MySQL `query(sql, params)` shape so callers can retain transaction boundaries.
- `publishDeliveryNotification(io, notification, options?)` emits `notification-added`; it calls the existing Expo sender only when `options.push` is supplied. It does not create another row.
- `options.push` supplies the Expo title, body, data, and Android channel. Add these as optional sender options so existing `sendPushNotification(userId, title, body, data)` call sites remain valid.
- Existing `sendPushNotification(userId, title, body, data)` and `{ request_id, type }` payload fields remain supported.

- [ ] **Step 1: Add failing tests for the notification record contract**

```ts
it('persists one row and returns the existing notification fields', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
  const notification = await persistDeliveryNotification(executor, {
    recipientId: 'rider-1', requestId: 'delivery-1', type: 'new_assignment',
    message: 'New delivery task assigned.',
  });
  expect(executor.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO notifications'),
    expect.arrayContaining(['rider-1', 'New delivery task assigned.', 'new_assignment', 'delivery-1']),
  );
  expect(notification).toMatchObject({ user_id: 'rider-1', request_id: 'delivery-1', type: 'new_assignment' });
});
```

- [ ] **Step 2: Run the focused server test and confirm it fails because the helper is absent**

Run: `npx vitest run server/services/__tests__/deliveryNotifications.test.ts`

Expected: the new module/import is not found.

- [ ] **Step 3: Implement the record and publish helpers**

Keep the notification row shape and ID prefix compatible with current records. The helper inserts using the supplied executor and returns the exact inserted fields. Make Expo sending optional and post-commit; catch push transport failures so they do not remove or roll back the saved inbox row. Retain `request_id` and `type`; add optional route/contact metadata only under the existing `data` object.

- [ ] **Step 4: Add route-level tests for assignment and delivery status recipients**

Add named tests `assignment_persists_and_pushes_once_to_assigned_rider`, `rider_status_start_notifies_requester_and_admin_without_self_push`, and `arrival_status_notifies_requester_and_admin`. Assert the Expo payload retains `request_id` and `type`; include recipient contact and destination coordinates only when present so mobile actions can be constructed.

- [ ] **Step 5: Update the assignment, status, and overdue call sites**

Persist event rows using the helper within existing transaction boundaries. Publish only after commit. Keep `request_id` and `type` in socket and Expo payloads. Add a delivery push option that chooses `delivery_urgent` for overdue and `delivery_updates` for ordinary assignment. Format the overdue title exactly as `Delivery Overdue` and body as `Delivery #<id> is overdue by <minutes> minute(s).`; append pickup → destination only when available. For overdue, retain the existing initial overdue marker and add a transaction-guarded once-only follow-up check at two hours, using a distinct `delivery_overdue_reminder` type. Only the assigned rider and Admin recipients receive overdue records; Personnel does not receive an overdue alert by default.

- [ ] **Step 6: Run focused server tests**

Run: `npx vitest run server/services/__tests__/deliveryNotifications.test.ts server/services/__tests__/proactiveOverduePush.test.ts server/routes/__tests__/notifications-security.test.ts`

Expected: all focused tests pass; tests verify exactly one initial alert and one maximum follow-up across repeated worker passes.

### Task 2: Make web notification behavior consistent and in-app only

**Files:**
- Modify: `src/app/context/DataContext.tsx`
- Modify: `src/app/personnel-v2/PersonnelV2Page.tsx`
- Modify: `src/app/components/Admin/NotificationBell.tsx`
- Create: `src/app/utils/notificationMessages.ts`
- Modify: `server/services/webPush.ts`
- Modify: `server/routes/notifications.ts`
- Test: `src/app/pages/__tests__/notification-filtering.test.ts`
- Test: `tests/unit/admin-notification-bell.test.tsx`
- Test: `src/app/context/__tests__/DataContext.notifications.test.tsx`

**Interfaces:**
- Keep the current `Notification` row fields and `notification-added` event.
- Keep `markNotificationRead` and `markAllNotificationsRead` APIs.
- Request navigation uses the existing request ID and each role's current route/view.

- [ ] **Step 1: Add failing tests for web status messages and role-specific navigation**

```ts
it('does not show an approval toast for an in-progress delivery update', () => {
  const message = getRequestUpdateToast({ status: 'approved', delivery_status: 'in_progress' });
  expect(message).not.toContain('Approved');
});
```

Create `src/app/utils/notificationMessages.ts` with exported pure function `getRequestUpdateToast(data)` returning a string or `null`. Also assert Personnel notification clicks mark read and select the linked request; Admin clicks mark read and highlight the linked request; terminal alerts remain visible as read history rather than disappearing silently.

- [ ] **Step 2: Run the focused web tests and confirm the new expectations fail**

Run: `npx vitest run src/app/pages/__tests__/notification-filtering.test.ts tests/unit/admin-notification-bell.test.tsx src/app/context/__tests__/DataContext.notifications.test.tsx`

Expected: failing expectations identify the current toast and click behavior.

- [ ] **Step 3: Separate delivery status messaging from request lifecycle messaging**

Implement `getRequestUpdateToast(data)` so a payload with `delivery_status` returns a delivery-specific message (or `null` when the user is the actor) before checking `status`. A payload without `delivery_status` keeps the current request lifecycle copy. Use the helper from `DataContext.tsx`.

- [ ] **Step 4: Align Personnel and Admin notification clicks and history**

Personnel marks the notification read, switches to the request view, and selects the linked request. Admin keeps dispatch selection/highlight behavior. Both show event, ID, time, unread state, and mark-all-read; terminal items remain available in history with a resolved status.

- [ ] **Step 5: Prevent browser push for web roles**

Keep the web inbox and Socket.IO refresh. Restrict the web push worker so it cannot send OS/browser pushes to Personnel/Admin; remove or disable the Personnel/V2 browser-push controls that promise a channel the product no longer uses. Do not change the Expo mobile sender.

- [ ] **Step 6: Run the focused web tests**

Run the command from Step 2.

Expected: all focused web notification tests pass.

### Task 3: Add Android channels, task actions, and deep links with Expo

**Files:**
- Create: `mobile-app/services/deliveryNotifications.ts`
- Modify: `mobile-app/hooks/use-push-notifications.ts`
- Modify: `mobile-app/hooks/data/useDashboard.ts`
- Modify: `mobile-app/app/_layout.tsx`
- Modify: `mobile-app/app.json`
- Modify: `mobile-app/components/NotificationModal.tsx`
- Test: `mobile-app/hooks/__tests__/use-push-notifications.test.ts`
- Test: `mobile-app/services/__tests__/deliveryNotifications.test.ts`

**Interfaces:**
- `initializeDeliveryNotificationChannels()` creates Android channels `delivery_updates` and `delivery_urgent` before asking for permission.
- `presentDeliveryPush(notification)` formats supported delivery pushes without changing backend payload field names.
- `routeNotificationResponse(response, router)` maps existing `request_id` payloads and the new `VIEW TASK`, `CALL`, and `OPEN MAP` action identifiers to the delivery route, `tel:` URL, or map URL.
- Register the push hook once from the authenticated root lifecycle, not from each dashboard consumer.

- [ ] **Step 1: Add failing tests for channel selection, existing payload compatibility, and action routing**

```ts
it('routes an existing request_id payload to the matching job', () => {
  const router = { push: vi.fn() };
  routeNotificationResponse({ data: { request_id: 'req_123', type: 'new_assignment' } }, router as never);
  expect(router.push).toHaveBeenCalledWith('/job/req_123');
});
```

Test overdue singular/plural copy, urgent-vs-normal channel selection, missing contact/coordinates, and each action identifier.

- [ ] **Step 2: Run the focused mobile Jest tests and confirm they fail**

Run from `mobile-app`: `npm test -- --runInBand hooks/__tests__/use-push-notifications.test.ts services/__tests__/deliveryNotifications.test.ts`

Expected: tests fail because the delivery notification service is not implemented.

- [ ] **Step 3: Implement Android channel initialization and permission flow**

Create both channels before calling `getPermissionsAsync()`/`requestPermissionsAsync()`. Configure `delivery_updates` with default importance and `delivery_urgent` with high importance, default sound, and a vibration pattern. For Expo pushes, pass the matching `channelId`. Request permission when status is not granted and cache a denied result for this session so the app does not prompt repeatedly. Keep iOS on the existing default notification handling path.

- [ ] **Step 4: Add push tap and action response routing**

Parse `request_id` first and retain compatibility with current conversation fields (`conversationId`). Open `/job/<id>` for `VIEW TASK` or default taps; use Expo Linking for `tel:<recipient_contact>` and `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` for `OPEN MAP`. Omit actions when their data is absent. Register categories before push listeners and use the action identifiers `VIEW_TASK`, `CALL`, and `OPEN_MAP`.

- [ ] **Step 5: Register listeners once and update the Android notification icon**

Remove push registration from `useDashboard()`, install it in the authenticated root lifecycle, and use the existing monochrome Android notification asset in the Expo Notifications config plugin. Keep this presentation code platform-gated.

- [ ] **Step 6: Run focused mobile tests and lint**

Run from `mobile-app`: `npm test -- --runInBand hooks/__tests__/use-push-notifications.test.ts services/__tests__/deliveryNotifications.test.ts` and `npm run lint`.

Expected: focused tests pass and lint reports no new errors.

### Task 4: Maintain one active-delivery notification and clear it on terminal status

**Files:**
- Modify: `mobile-app/services/deliveryNotifications.ts`
- Modify: `mobile-app/hooks/data/useJobDetails.ts`
- Modify: `mobile-app/app/job/[id].tsx`
- Test: `mobile-app/services/__tests__/deliveryNotifications.test.ts`
- Test: `mobile-app/hooks/data/__tests__/useJobDetails.notifications.test.ts`

**Interfaces:**
- Stable active notification key: `active-delivery:<request_id>`.
- `updateActiveDeliveryNotification(job, eta)` presents/updates the same Android notification with `Rider is on the way`, delivery ID, and fresh ETA when available.
- `clearActiveDeliveryNotification(requestId)` removes the matching active notification.

- [ ] **Step 1: Add failing tests for one active alert, ETA fallback, and terminal cleanup**

```ts
it('clears the active notification when a delivery becomes completed', async () => {
  await syncActiveDeliveryNotification({ request_id: 'req_123', delivery_status: 'completed' });
  expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('active-delivery:req_123');
});
```

Also assert stale/unavailable ETA is omitted and repeated updates do not create additional active notification IDs. Use `scheduleNotificationAsync({ identifier: activeKey, content: { sticky: true, ... }, trigger: null })` and `dismissNotificationAsync(activeKey)` as the service contract; validate same-ID replacement on the target development build before relying on it.

- [ ] **Step 2: Run the focused mobile tests and confirm they fail**

Run from `mobile-app`: `npm test -- --runInBand services/__tests__/deliveryNotifications.test.ts hooks/data/__tests__/useJobDetails.notifications.test.ts`

Expected: failing tests show the active notification synchronization is absent.

- [ ] **Step 3: Implement sticky active notification update and terminal cleanup**

Use `expo-notifications` Android sticky content and the stable task key as the `NotificationRequestInput.identifier`. Cancel/re-schedule that request when ETA changes; dismiss the same identifier on terminal status. Update only when the task status or fresh ETA changes. Clear on `completed`, `delivered`, `failed`, or `cancelled`. Do not show a progress percentage unless the app has a valid calculated percentage.

- [ ] **Step 4: Validate remote replacement and progress support in a Development Build**

Exercise the same delivery twice and verify Android shows one active item that can be updated and cleared. If Expo cannot reliably replace the remote notification or expose progress, stop before adding a package and report the limitation for a design decision. Do not add Notifee in this task without that decision.

- [ ] **Step 5: Run the focused mobile tests**

Run the command from Step 2.

Expected: all active-notification tests pass.

### Task 5: Verify end-to-end behavior and provide release notes

**Files:**
- Verify: files changed in Tasks 1–4
- Manual verification: Android Expo Development Build and iOS device/simulator

- [ ] **Step 1: Verify rider assignment**

Assign a delivery to a rider. Confirm one mobile inbox item and one normal-priority Android push, then tap each and verify `/job/<request_id>` opens.

- [ ] **Step 2: Verify arrangement changes and web audiences**

Change a rider assignment/schedule. Confirm the affected rider and intended requester/Admin inboxes receive one item, the actor does not receive a self-notification, and web roles receive no browser push.

- [ ] **Step 3: Verify overdue timing and duplicate suppression**

Use a test delivery deadline in the past. Confirm urgent title/body, route text where available, one follow-up after two hours, and no additional reminders after reschedule/completion/cancellation.

- [ ] **Step 4: Verify active delivery and actions**

Start a delivery and confirm one sticky Android notification with current ETA if available. Test `VIEW TASK`, `CALL`, and `OPEN MAP`. Complete/cancel it and confirm the notification is removed. Record progress as unsupported if Expo exposes no usable progress API.

- [ ] **Step 5: Verify web and iOS regressions**

Confirm web status updates do not show approval toasts, web notification clicks open the correct request, and iOS continues to receive standard notifications and task deep links.

- [ ] **Step 6: Report deliverables**

List changed files, packages added (expected none unless separately approved), Android/native configuration changes, manual test steps/results, and whether a new Development Build is required. A config plugin icon or native permission change requires rebuilding the Development Build.

- [ ] **Step 7: Run the repository quality gate after all focused tests pass**

Use the `quality-gate` skill and run applicable checks in this order: lint, typecheck, test, build. Stop and fix any failure before continuing. Run the mobile lint/test/build checks from `mobile-app` and the web/server checks from the repository root as defined by their package scripts.
