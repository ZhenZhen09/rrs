# Feature Spec: Removing Automatic Geofence Trigger

## 1. Goal
Remove the automatic GPS-based geofence trigger that marks a delivery as "arrived" to simplify the system logic and reduce race conditions. The rider flow will remain direct: `Start Delivery` -> `Complete / Fail`.

## 2. Architecture Changes

### A. Backend (`server/locationTracking.ts`)
- **Remove:** The automatic distance calculation and database update that forces `delivery_status = 'arrived'` when `distanceToDropoff <= GEOFENCE_RADIUS_M`.
- **Remove:** The socket.io broadcast for the `arrived` status change.
- **Keep:** The `PROXIMITY_WRITE_INTERVAL_MS` (3s) optimization when near the destination to maintain high-fidelity tracking on the Admin map. 

### B. Mobile App UI (Rider App)
- **Status Flow:** `in_progress` -> `completed` / `failed`.
- **Logic:** No changes required to the UI components as they already support direct transition from `in_progress` to terminal states.
- **Verification:** Ensure that entering the destination zone no longer triggers a status badge change to "ARRIVED".

## 3. Testing Strategy
- Update the E2E test `tests/location-tracking-validation.spec.ts` to verify that coordinates exactly at the drop-off point **do not** change the status to `arrived`.
- Verify the 3-second high-precision tracking still functions near the destination.
