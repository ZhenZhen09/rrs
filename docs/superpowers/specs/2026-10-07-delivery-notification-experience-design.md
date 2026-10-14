# Delivery Notification Experience

## Status

Proposed design for review. No implementation changes are authorized by this document alone.

## Goal

Make delivery notifications useful, timely, and consistent across Personnel/V2, web Admin, and the rider mobile app. Preserve current delivery IDs and existing notification payload fields so current clients and backend flows continue to work.

## Agreed behavior

- Personnel/V2 and web Admin receive in-app notifications only.
- Riders receive in-app notifications and mobile push notifications.
- A rider status change, rather than a GPS geofence, marks delivery milestones such as started or arrived at destination.
- Delivery-specific notifications open the matching Delivery Details screen or web request.
- The `CALL` action calls the destination recipient by default. `OPEN MAP` opens navigation to the destination.
- Keep the feature focused on delivery events; routine location updates do not create notifications.
- Use one overdue alert when a task first becomes overdue and at most one follow-up two hours later while it remains overdue. Stop reminders when a schedule change makes it no longer overdue or when it reaches a terminal state.

## Existing behavior and constraints

- The shared `notifications` table is already used for in-app notification history. The authenticated notifications endpoint filters rows to the signed-in user and returns the latest 50.
- Socket.IO `notification-added` events refresh the web and mobile notification lists.
- The server already has a proactive overdue worker that sends one overdue notification and an Expo push to the assigned rider. It records an overdue marker to avoid repeating the initial alert.
- Rider assignment currently creates an in-app notification and live event, but that assignment path does not send an Expo push.
- Mobile push registration and receipt handling live in `mobile-app/hooks/use-push-notifications.ts`. Push taps currently route only conversation messages; the in-app notification list can route task notifications to `/job/[id]`.
- Mobile delivery data already includes pickup and destination details, recipient contact information, and the app already calculates an ETA in the job details flow.
- Android currently has a single `default` notification channel. The Expo notification config plugin uses the app icon; a monochrome notification icon asset is already present.
- The shared web context currently interprets `request-updated` status as request lifecycle status. Delivery status events also use that event with `status: 'approved'`, which can produce a misleading approval toast.
- `useDashboard()` installs the push hook and is called from multiple app layouts/screens, so push registration and listeners are not owned by one app-level lifecycle.
- The Personnel/V2 interface currently exposes browser push controls, and a server worker can send browser push for new notification rows. This conflicts with the agreed rule that web clients use in-app notifications only.

## Notification flow

Use the existing notification row as the durable in-app record. After a business event commits, create one row per intended recipient, emit `notification-added` to refresh the online client, and send an Expo push only when the recipient is the rider and the event warrants a mobile alert. Do not create a second row when delivering the push. Keep `request_id` and existing `type`/`data` fields; optional presentation details may be added without removing or renaming existing fields.

Delivery event handling should be centralized enough that each transition applies the same recipient and channel rules. Existing route-specific notification logic and legacy payload consumers remain compatible. Duplicate suppression should use the delivery ID plus event kind, with a stable identifier for the active-delivery notification.

## Recipient and event behavior

| Event | Personnel/V2 | Web Admin | Rider mobile inbox | Rider mobile push |
| --- | --- | --- | --- | --- |
| Request submitted | Confirmation to requester | New request requiring review | — | — |
| New assignment or assignment/schedule change | Request update | Assignment change for other admins; no alert to the admin who made it | Assignment/change details for the affected rider | Normal priority |
| Delivery started (`in_progress`) | Delivery started | Delivery started | Update active task state | No push to the rider for their own action |
| Rider marks arrival at destination | Rider arrived | Rider arrived | Update active task state | No push to the rider for their own action |
| Completed, failed, or cancelled | Final delivery result | Final delivery result | Update task history and clear active alert | Push only for a meaningful server-side change not initiated by that rider |
| Delivery becomes overdue | — | Overdue alert | Overdue alert | Urgent push at first overdue transition and one two-hour follow-up |

Personnel/Admin alerts should be written to their existing in-app notification lists. No browser push should be delivered for these web recipients. The existing browser push UI/worker needs to be aligned with that rule in this feature; it must not silently send the new web notification rows as OS/browser pushes.

## Web notification experience

- Personnel/V2: clicking an item marks it read and opens the linked request in the request view.
- Admin: clicking an item marks it read and opens/highlights the linked request in dispatch.
- Both lists show the event message, delivery/request identifier, time, and unread state; keep the existing 50-item limit and mark-all-read action.
- Use clear, event-specific messages. Do not display an approval toast for ordinary delivery status changes.
- Hide or visibly resolve stale delivery alerts when their task is completed, failed, or cancelled; do not silently hide unread history without a clear policy.

## Rider mobile in-app and push experience

### In-app list

- Keep the current notification modal and mark-read behavior.
- A task notification opens `/job/<request_id>`.
- Show a meaningful event label/icon and the delivery ID; show pickup and destination when available.

### Push presentation

- `delivery_updates` channel: Android default importance for assignment and normal delivery updates.
- `delivery_urgent` channel: Android high importance, default sound, and vibration for overdue alerts.
- Overdue title: `Delivery Overdue`.
- Overdue body: `Delivery #<id> is overdue by <minutes> minute(s).` Include pickup → destination where data is available, without replacing the required overdue text.
- Active-delivery title: `Rider is on the way`; show `Delivery #<id>` and a fresh ETA when available.
- Use the delivery/rider monochrome notification icon on Android. Keep iOS behavior on the existing standard notification path; Android channel and action behavior must be platform-gated.
- Request notification permission through the existing Expo permission flow, creating Android channels before prompting. Treat denied permission as a supported state and do not repeatedly prompt.
- Notification taps and action responses route to the matching delivery. `CALL` opens the recipient phone action when a number exists; `OPEN MAP` opens a navigation URL when destination coordinates exist. Hide unavailable actions rather than showing dead buttons.

### Active delivery notification

- While a delivery is `in_progress`, show one ongoing Android notification for that delivery. Update it as fresh ETA/progress data becomes available, rather than creating a new visible item.
- Remove it when the delivery becomes `completed`, `delivered`, `failed`, or `cancelled`.
- If ETA is stale/unavailable, keep the active notification useful with the delivery ID and omit the ETA.
- Display a progress bar only when a meaningful progress percentage is available. Do not invent progress from stale location data.

## Expo and native compatibility gate

The installed `expo-notifications` version provides Android `sticky` notification content, channel configuration, notification categories/actions, and notification identifiers. Its installed content type does not expose a progress-bar field. Therefore:

1. Implement channels, urgency, supported actions, deep links, and a sticky active notification with `expo-notifications` first.
2. Before promising a progress bar or reliable replacement of a remote push notification in the shade, validate the exact Android behavior in the development build. A notification identifier used for local notifications is not assumed to update a separately delivered remote notification.
3. If progress or remote replacement cannot be delivered with Expo Notifications, stop before adding Notifee or another native dependency. Report the exact limitation and request a design decision. The Expo-only implementation may omit the progress bar while preserving the other supported behavior.
4. Any Android manifest, config plugin, native icon, permission, or dependency change that requires prebuild must be listed, and the test plan must state that a new development build is required.

## Error handling and delivery guarantees

- A push transport failure must not undo a committed in-app notification.
- Missing contact, destination, ETA, or notification permission degrades the presentation gracefully; it must not prevent task navigation or in-app history.
- The overdue worker must be idempotent across overlapping worker passes and server restarts. The first alert and follow-up each need a durable once-only guard.
- Keep per-user authorization on notification reads and mark-read updates.
- Do not send push alerts to Personnel/Admin. Push delivery is for rider mobile accounts only.

## Out of scope

- Replacing Socket.IO, the notifications table, or the existing Expo push service.
- Sending push for every rider location change.
- Automatic geofence arrival detection.
- Custom pixel-perfect Android notification layouts.
- Broad notification preference settings or unrelated web toast redesign.

## Validation scenarios

1. New assignment creates one rider inbox item and one rider push; tapping either opens the matching delivery.
2. Schedule/reassignment changes notify the affected rider and intended web recipients once.
3. Overdue transition sends the required urgent text; the two-hour follow-up sends once; completion/cancellation stops future reminders.
4. Active delivery creates one sticky item, refreshes ETA when fresh data exists, and clears on completion/cancellation.
5. `VIEW TASK`, `CALL`, and `OPEN MAP` work when their required IDs/contact/coordinates exist; absent data hides or safely degrades the action.
6. Personnel/V2 and Admin receive only in-app notifications, with correct deep links and read state.
7. Android permissions/channels and the notification icon work on a development build; iOS retains its standard notification flow.
8. Existing payload consumers continue to receive the existing delivery ID and payload fields.
