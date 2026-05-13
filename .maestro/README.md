# Maestro Flows

These flows target the rider app in `mobile-app/` running on the Android emulator.

## Prerequisites

1. Start the emulator and verify it is visible:
   `adb devices`
2. Start Expo from `mobile-app/`:
   `npx expo start`
3. Press `a` in the Expo terminal to open the app in the emulator.
4. Verify Maestro sees the emulator:
   `maestro list-devices`

## Recommended execution order

1. `maestro test .maestro/smoke/app-launch.yaml`
2. `maestro test .maestro/smoke/login-success.yaml`
3. `maestro test .maestro/smoke/tab-navigation.yaml`
4. `maestro test .maestro/functional/open-first-today-job.yaml`
5. `maestro test .maestro/functional/start-delivery.yaml`

## Notes

- `login-success.yaml` uses the demo rider account `rider1@company.com` with PIN `1234`.
- The functional flows that open a job require seeded rider data in the backend.
- `start-delivery.yaml` only starts a job; it does not complete or fail it to avoid mutating test data too aggressively.
