# Rider Managed-Device Connectivity and Recovery

## Rider recovery

- If the app says **No Internet Connection**, reconnect the device using its approved network controls, then tap **Retry**.
- If the app says **Cannot reach Errands**, the device has a network connection but the service did not respond. Keep the app open when practical, tap **Retry**, and contact dispatch or IT if the issue continues.
- A delivery update marked **Pending sync** is saved on the device but has not been acknowledged by the server. Do not repeat the update as a workaround.
- **Needs attention** means the server rejected an update or a conflict needs dispatch review. Keep the app data intact and contact dispatch with the delivery reference.
- Do not sign out on a shared device while updates are pending unless necessary. The app warns before logout; pending data remains stored for the same rider and is hidden from other riders.

## Device management

- Android managed-device policy should provide an IT-approved way to restore Wi-Fi or mobile data while preserving the configured lock-task restrictions. Validate the route on the deployed device policy; the app does not bypass kiosk restrictions or open an unverified network-settings shortcut.
- iPhone/iPad app-lock policy should provide an IT-managed recovery route for Wi-Fi or cellular connectivity. Riders should contact their supervisor or IT rather than relying on an in-app Wi-Fi settings shortcut.
- Keep dispatch/IT support contact details available to riders outside the app (for example, on the device information card).
- Device-management policy is independent of app connectivity; an outage does not change or release device lock state.

## Acceptance checklist

- [ ] On a managed test device, start a delivery while online, disconnect networking, update its status, and confirm **Pending sync**.
- [ ] Force-stop and relaunch after more than 24 hours; confirm the original rider can still open the saved delivery and pending action.
- [ ] Restore connectivity and confirm the action becomes **Synced** only after server acknowledgment, with one status log for the operation.
- [ ] With Wi-Fi available but the service unavailable, confirm **Cannot reach Errands** and that the update remains pending.
- [ ] Confirm a permanent server rejection remains visible as **Needs attention** with its reason.
- [ ] On a shared device, sign in as a second rider and confirm the first rider's cached delivery and queued actions are not shown or uploaded.
- [ ] Verify Android and iOS connectivity-recovery instructions against the actual deployed management policy.

## Deployment order and limitations

Deploy `server/scripts/2026-10-21-rider-status-operations.sql` and the server changes before publishing the mobile client. Full outage/restart/shared-device acceptance and managed connectivity-policy verification require a running test device and deployed server. The `Pixel_3a_API_34_extension_level_7_x86_64` local AVD is attached, but its native app build is blocked by an incomplete local NDK installation (`source.properties` is missing); it also does not represent the managed kiosk policy. Record acceptance using the checklist above.
