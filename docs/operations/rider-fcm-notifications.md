# Rider FCM notification deployment

The Android rider app sends a device FCM token to the authenticated Node.js backend. The backend sends rider alerts through Firebase Admin SDK. Socket.IO remains the live channel for connected riders, and Expo Push remains a temporary fallback only for riders without an FCM token. iOS FCM is out of scope until its Firebase plist and APNs credentials are available.

## Firebase and server credentials

- The rider app is registered in Firebase project `cfa-rss` as Android package `com.hon01.cfarss` and iOS bundle ID `com.hon01.cfarss`.
- Enable the Firebase Cloud Messaging API for that project.
- Configure the Node.js deployment with `FIREBASE_PROJECT_ID=cfa-rss` and either:
  - workload identity/Application Default Credentials with permission to send FCM messages, or
  - `FIREBASE_SERVICE_ACCOUNT_JSON` containing the service account JSON as a deployment secret.
- Keep service account credentials out of `.env.example`, source control, build artifacts, and the rider app. Rotate the secret through the deployment secret manager.
- Do not print device tokens or service account values in deployment logs.

## iOS follow-up

Before enabling iOS FCM, add the Firebase `GoogleService-Info.plist` for project `cfa-rss`, configure the APNs authentication key in Firebase, and enable the push notification entitlement in the signed EAS build. Test remote pushes on a signed physical device.

## Database rollout

Run the migration from the repository root after confirming the target database and credentials:

```powershell
node scripts/migrate-rider-fcm-tokens.cjs --dry-run
node scripts/migrate-rider-fcm-tokens.cjs
```

The migration adds a nullable `users.fcm_token` column and is safe to rerun. Existing `expo_push_token` values remain during rollout.

## App rollout

- Build the native Android rider app with EAS or the matching local native build command; Expo Go does not include the native Firebase Messaging module.
- Upgrade a rider app to register an FCM token. The backend prefers FCM for that rider. Riders who have not upgraded continue to use their existing Expo token, with no double send.
- After a rider logs out, the app asks the backend to clear both current FCM and legacy Expo tokens. An offline logout may prevent that remote cleanup; the next successful sign-in registers the active FCM token again.
- Keep the Expo sender until supported installed rider versions have migrated. Remove it in a separate cleanup after the rollout is confirmed.

## Operational checks

- Confirm the rider row has a nonempty `fcm_token` after sign-in; never include the token value in logs or support screenshots.
- Send a test assignment to an Android device in foreground and background.
- Confirm the Android notification uses the `delivery_urgent` channel for assignments, messages, cancellations, and overdue alerts.
- Revoke or rotate a test token and confirm Firebase invalid-token responses clear only the stale token.
- Treat push timing as best effort; connectivity, notification permissions, APNs, and device power policies can delay delivery.
