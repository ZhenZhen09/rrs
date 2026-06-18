# Design Spec: Location Data Auto-Recovery

## Overview
Automatically recover missing GPS coordinates (lat/lng) for delivery requests by geocoding their text addresses. This ensures that legacy or broken data can still render route visualizations in the Admin Dispatch Console.

## Problem Statement
The `DispatchMapView` component strictly requires `lat` and `lng` numbers. If these are missing (e.g., legacy data or failed geocoding during submission), the component renders a "Location Data Missing" placeholder, preventing admins from seeing the route or rider position.

## Proposed Solution: Silent Background Repair
Implement a background recovery mechanism that triggers when an admin views a request with missing location data.

### 1. Frontend Recovery Hook (`DispatchMapView.tsx`)
- **Detection:** If `origin` or `destination` is missing valid coordinates.
- **Geocoding:** Use the existing Geoapify API key to fetch coordinates for the text address.
- **Optimistic Update:** Render the map as soon as coordinates are recovered.
- **Persistence:** Call a new backend endpoint to save the recovered coordinates permanently.

### 2. Backend Patch Endpoint (`server/routes/requests.ts`)
- **Route:** `PUT /api/requests/:id/patch-locations`
- **Security:** `authorize(['admin'])`
- **Payload:** `{ pickup?: { lat, lng }, dropoff?: { lat, lng } }`
- **Action:** Update the `delivery_requests` table with the provided coordinates.
- **Audit:** Log the recovery action in the audit trail.

### 3. Visual Feedback
- Replace the current "Missing Data" error with a **"Recovering Location..."** state.
- Include a small loading spinner and a "Fixing data automatically" sub-text.

## Technical Components

### Frontend
- **File:** `src/app/components/Admin/Dispatch/DispatchMapView.tsx`
- **Logic:** Add `useLocationRecovery` hook to manage geocoding state and DB sync.

### Backend
- **File:** `server/routes/requests.ts`
- **File:** `server/schemas/requestSchema.ts` (Add `patchLocationSchema`)

## Success Criteria
- [ ] Requests with missing `lat/lng` automatically show a map after a short delay.
- [ ] Recovered coordinates are saved to the database.
- [ ] Refreshing the page shows the map instantly (no second geocoding call).
- [ ] Admins see a non-intrusive "Recovering..." state instead of a blocking error.

## Testing Plan
1. **Database Setup:** Manually set `pickup_lat` to `NULL` for a test request.
2. **UI Verification:** Open the request in the Dispatch Console.
3. **Network Check:** Verify a call to `api.geoapify.com` followed by a `PUT` to `/patch-locations`.
4. **Final Check:** Refresh the page and verify the map loads instantly from the DB coordinates.
