# Personnel and Admin Web Push Notifications

## Goal

Add optional browser push notifications for Personnel/V2 and Admin users on supported mobile browsers and installed web apps. Push supplements the in-app inbox; the inbox remains the complete notification history. Rider notifications continue through the existing Expo path.

## User decisions

- First rollout sends only important, role-specific events.
- Admin events: new request submissions and dispatch issues, including assignment cancellations and rider deviation requests.
- Personnel events: request approval, decline, revision request, and cancellation.
- Users enable or disable web push for each browser/device. Permission is requested only after an explicit user action.
- No Git commit or push is requested.

## Existing system context

- `src/app/utils/webPush.ts` implements browser capability detection, VAPID subscription, enable/disable, and status requests.
- `public/push-sw.js` displays push payloads and handles notification clicks.
- `vite.config.ts` includes that handler in the generated PWA service worker.
- `server/services/webPush.ts` configures VAPID and stores subscriptions in `web_push_subscriptions`; its current polling worker is intentionally disabled.
- `server/routes/notifications.ts` exposes authenticated subscription endpoints and separately gates Expo pushes to riders.
- Personnel/V2 has Preferences and an in-app notification bell. Admin has an in-app notification bell and profile controls, but no web-push setting.
- Request events are created across request routes and the server watchdog. Existing notification rows are the source of in-app history.

## Approaches considered

1. **Re-enable the existing cursor worker.** This is a small code change, but the worker currently scans all notification types, has no role-specific allowlist or durable per-event delivery state, and uses an in-memory cursor. Restarts or multiple server instances make delivery behavior unreliable. Not recommended.
2. **Send push directly from each event producer.** This can be low-latency, but spreads push policy across request routes and background jobs and makes it easy for one producer to bypass filtering or duplicate handling. Not recommended.
3. **Queue eligible saved notifications for a shared dispatcher.** After an in-app notification is committed, a shared path evaluates recipient role and event type, records eligible work durably, and dispatches to that user’s subscribed devices. A unique notification ID and per-endpoint delivery state support retries without re-sending successful deliveries. This reuses the existing notification records and subscription table while centralizing policy. Recommended.

## UX and event policy

- Add a clearly labeled browser-notification control to Personnel Preferences and an equivalent, discoverable Admin setting.
- Show whether the browser is unsupported, permission is denied, push is not configured, or this device is subscribed. Keep the inbox available in every state.
- Request permission only from the Enable control’s tap/click handler; never prompt on page load.
- Explain that browser/device permission is controlled by the operating system and can also be revoked there.
- Deliver push only for the role/event combinations in the user decisions above. All notification types continue to appear in the in-app inbox according to current behavior.
- Keep payloads concise and avoid including sensitive request details. Include the existing request ID and a same-origin destination URL that opens the relevant request in the correct role area.

## Server and data flow

1. An existing event producer saves the in-app notification using its current persistence path.
2. After the transaction commits, the shared notification publisher evaluates a centralized allowlist using the saved event type and authenticated recipient’s role. Ineligible events remain inbox-only.
3. Eligible notification IDs are placed in durable push work. A dispatcher sends them to subscriptions owned by that recipient and records per-device results with a uniqueness key based on notification ID and endpoint hash.
4. Retry transient provider/network errors with bounded backoff. Delete subscriptions returning 404/410. Do not let push delivery errors roll back or fail the already-saved in-app notification.
5. Preserve the existing Expo rider path and do not send rider records through web push.

Subscription APIs must bind each endpoint to the authenticated account; only Admin and Personnel roles can register for this staff web-push feature. Status and deletion operations must be scoped to the signed-in user. Subscription endpoints and encryption keys are sensitive and must not appear in logs or client-visible responses. Preserve authenticated request protections already used by the API.

## Browser and service-worker behavior

- Reuse the current Web Push API, VAPID configuration, PWA registration, and service worker. Do not add a native notification package or change Expo configuration.
- Feature-detect Push API, service worker, and Notification API; use HTTPS in production. Unsupported or denied environments continue with in-app notifications.
- The service worker displays the payload immediately, with a stable notification identifier for duplicate replacement. Clicking it opens or focuses the same-origin app URL for the associated request.
- Browser display and action support varies. No custom native layout or guaranteed buttons are part of this design.
- On iOS/iPadOS 16.4 and later, Web Push is supported for web apps added to the Home Screen; users must grant permission from a user gesture. Do not promise push for every mobile browser or an ordinary Safari tab.

## Boundaries

- In scope: Personnel/V2 and Admin browser opt-in, role/event filtering, reliable dispatch and dedupe, service-worker display/click behavior, subscription cleanup, and focused verification.
- Out of scope: changing the existing inbox, changing rider Expo push, sending every inbox event, preference syncing across devices, notification categories/preferences beyond the approved allowlist, and native app notifications.

## Error handling and privacy

- Missing/invalid VAPID configuration leaves push unavailable and must not affect the inbox.
- Permission denial is a normal user choice; show a useful status and do not repeatedly prompt.
- Retry transient web-push provider errors without blocking request workflows; remove invalid/expired endpoints.
- Do not expose subscription secrets, VAPID private keys, or sensitive request details in push payloads or logs.
- Re-check role and ownership on all subscription API operations. Validate click destinations as same-origin paths before navigation.

## Verification criteria

- Supported browser: user can enable one device, see its state, disable it, and re-enable it without creating duplicate subscriptions.
- Unsupported browser, denied permission, or missing VAPID setup: clear status is shown and in-app notifications continue to work.
- Admin receives only the approved Admin event types; Personnel receives only the approved Personnel event types; riders receive no web push.
- Event dispatch is idempotent across retries/restarts and sends once per eligible notification/device; stale endpoints are removed.
- Push click opens the correct request route for Personnel/Admin and never navigates off-origin.
- Verify Android Chrome and supported iOS/iPadOS Home Screen web-app behavior where available, plus desktop browser regression.
- Verify existing Expo rider push and inbox behavior remain unchanged.
