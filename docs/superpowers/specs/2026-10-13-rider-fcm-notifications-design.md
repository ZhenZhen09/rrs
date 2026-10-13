# Rider FCM Push Notifications

## Status

Proposed design for review. No implementation changes are authorized by this document alone.

## Goal

Deliver near-instant job and rider-message push alerts through Firebase Cloud Messaging (FCM), while retaining Socket.IO for live updates when the rider app is connected.

## Agreed scope

- Migrate rider remote push delivery from Expo Push Service to direct FCM through Firebase Admin SDK.
- Keep authenticated Socket.IO events as the real-time channel for connected riders.
- Keep the Node.js backend and database authoritative for job and notification state.
- Update the Expo rider app to register native FCM tokens, receive notifications in foreground/background, refresh relevant server data, and route notification taps to jobs or conversations.
- Cover required backend token storage and sender changes so the implementation works end to end.
- Keep browser push, admin/personnel notification behavior, and routine GPS updates outside this change.

## Current state

- `mobile-app/app/_layout.tsx` owns the app-level `usePushNotifications(user?.id)` hook.
- `mobile-app/hooks/use-push-notifications.ts` requests permission, obtains an Expo push token using `getExpoPushTokenAsync`, registers it through `/api/notifications/register-token`, listens for received notifications, invalidates notifications/tasks/history caches, and routes notification taps.
- `mobile-app/context/LocationContext.tsx` maintains the authenticated Socket.IO connection and invalidates rider data for `request-updated`, `delivery-status-updated`, and `notification-added` events.
- `mobile-app/services/deliveryNotifications.ts` defines Android notification channels/actions and routes task and conversation payloads.
- `mobile-app/app.json` configures `expo-notifications` and points Android at `mobile-app/google-services.json`.
- `server/routes/notifications.ts` stores a single `expo_push_token` on each user and sends via `expo-server-sdk`. Server event flows call the exported `sendPushNotification` helper.
- `server/package.json` does not currently include Firebase Admin SDK. No Firebase messaging module is installed in `mobile-app`.

## Architecture

1. A backend job/message operation commits durable state and notification history first.
2. The backend emits its existing authenticated Socket.IO event. Connected rider clients refresh from the API and update promptly.
3. The backend sends an FCM notification through Firebase Admin SDK to the assigned rider's active FCM registration token. Android messages use high delivery priority for time-sensitive alerts; iOS messages use APNs priority 10 where suitable. Priority is a delivery request and does not guarantee instant device delivery.
4. The operating system displays notification payloads while the app is backgrounded or terminated. Foreground receipt refreshes the notification, task, history, and affected job query caches; a tap refreshes the relevant data and navigates to the job or conversation.
5. Push payloads carry routing identifiers and a stable event/notification ID, not authoritative job details. The app reloads details from authenticated backend APIs.

## Components and boundaries

- **Rider app push registration:** Keep `expo-notifications` as the Expo-compatible notification presentation/permission layer. Add React Native Firebase Messaging for native FCM registration and message handling, configured through Expo config plugins. Register/refresh the FCM token after authenticated login and when Firebase reports token rotation. Keep platform-specific setup in app config and Firebase files; never put service-account credentials in the app.
- **Backend token lifecycle:** Add an FCM token store (prefer a separate `fcm_token` column during migration) and authenticated register/unregister endpoints. The authenticated user ID comes from the JWT. Registration replaces the user's current token; logout unregisters it where possible. Do not accept arbitrary recipient user IDs from the client.
- **Backend FCM sender:** Add a focused Firebase Admin messaging service initialized from server environment/service-account configuration. Preserve the `sendPushNotification(userId, title, body, data, options)` call surface used by request and messaging flows, but send to valid FCM tokens. Restrict push to rider recipients. Remove invalid/unregistered tokens after FCM reports them as permanently invalid; log provider errors without secrets.
- **App event handling:** Keep Socket.IO ownership in `LocationContext` and push lifecycle ownership in the root layout. Handle foreground messages, background notification opens, cold-start notification responses, and token rotation once per app lifecycle. Reuse the existing notification routing helper and query keys.
- **Data and compatibility:** Keep notification database rows and existing `type`, `request_id`, and conversation routing fields. Store FCM tokens separately from existing Expo tokens because the token formats cannot be interchanged. During rollout, prefer FCM whenever an FCM token is registered; use the existing Expo sender only for riders who have no FCM token yet. Never send the same event through both providers to the same rider. Removing the Expo fallback is a later, separate cleanup after supported rider builds have migrated.

## Reliability and security

- Persist the notification/job event before attempting push. Push failure must not roll back a committed job change or block the Socket.IO emit.
- Handle duplicate delivery idempotently by using the event ID and fetching authoritative state. Avoid duplicate navigation on repeated tap callbacks.
- Re-register changed FCM tokens. Scope token operations to the authenticated rider and clear invalid tokens after provider confirmation.
- Keep FCM credentials only in server/EAS secret configuration as applicable. Do not log tokens, service-account JSON, or message contents containing private rider/customer details.
- Use notification messages with small routing data so the OS can display alerts in background. Do not rely on background JavaScript execution for displaying the system notification.
- Use high priority only for time-sensitive assignment/cancellation/message alerts that require prompt rider attention. Routine state refreshes and location events remain on Socket.IO/API paths.
- Push delivery timing depends on connectivity, platform permissions, device power policies, and FCM/APNs; the product promise is near-real-time best effort, not guaranteed instant delivery.

## Platform requirements

- Android requires the Firebase project and app identifiers in `google-services.json` to match `com.hon01.cfarss`, plus native build configuration and a development/production build; Expo Go is not a valid FCM test target.
- iOS requires the rider bundle identifier `com.hon01.cfarss`, APNs authentication configured in Firebase, push entitlements/background notification configuration, and signed physical-device builds for end-to-end push tests.
- Build and validate Android and iOS separately. Web behavior remains unchanged.

## Validation

- Unit tests cover registration authorization, token rotation, invalid token cleanup, priority/payload construction, sender failure isolation, foreground cache invalidation, background receipt/open, cold-start routing, and duplicate taps.
- Route/service integration tests prove only rider accounts receive FCM pushes and committed business operations remain successful when FCM is unavailable.
- Validate with development builds on physical Android and iOS devices: app foreground, background, force-quit/cold start, denied permission, offline then reconnect, stale token rotation, Socket.IO connected/disconnected, and job/conversation routing.
- Confirm Android high-priority delivery and notification channel importance; verify iOS APNs delivery through Firebase. Do not assert strict timing guarantees in automated tests.

## Out of scope

- Changes to admin web or personnel notification UX.
- Replacing Socket.IO, the notifications table, or REST job APIs.
- Guaranteed background execution or delivery-time SLAs.
- Push for GPS/location telemetry, attendance, or routine updates.
- Browser push migration or broad notification copy redesign.
