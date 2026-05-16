# Feature Spec: Manual Rider Arrival Confirmation

## 1. Goal
Remove the automatic GPS-based geofence trigger that marks a delivery as "arrived" and replace it with a manual process control flow where the rider explicitly confirms their arrival at the destination.

## 2. Architecture Changes

### A. Backend (`server/locationTracking.ts`)
- **Remove:** The automatic distance calculation and database update that forces `delivery_status = 'arrived'` when `distanceToDropoff <= GEOFENCE_RADIUS_M`.
- **Keep:** The `PROXIMITY_WRITE_INTERVAL_MS` (3s) optimization when near the destination to maintain high-fidelity tracking on the Admin map. 
- **API Support:** Ensure the `PUT /api/requests/:id/status` endpoint fully supports the manual transition from `in_progress` -> `arrived`.

### B. Mobile App UI (Rider App)
- **Current Flow:** `Start Delivery` -> (auto geofence) -> `Complete / Fail`
- **New Flow:** `Start Delivery` -> **`Confirm Arrival`** -> `Complete / Fail`
- **UI Update:** Add a new primary action button "I Have Arrived" that appears when the job is `in_progress`.
- **Validation:** The `Complete Delivery` button should only be accessible *after* the status has been manually set to `arrived`.

## 3. Data Flow
1. Rider taps "Start Delivery" (Status: `in_progress`).
2. Rider drives to the location. Tracking remains active (switching to 3s interval near destination).
3. Rider parks and taps "I Have Arrived" (Status -> `arrived`).
4. Backend logs the exact timestamp and coordinates of the manual arrival tap.
5. UI unlocks the "Complete Delivery" and "Report Failure" options.

## 4. Testing Strategy
- The hybrid E2E test `location-tracking-validation.spec.ts` will be updated to verify that injecting coordinates *does not* change the status.
- A new API test step will verify the manual status update to `arrived`.