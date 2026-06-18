# Design Spec: Privacy-Focused Location Duty Gating

## Overview
Enable riders to control their privacy by stopping location tracking and data transmission when they are off-duty or logged out. This implementation respects the system-level "Always" location permission while ensuring that no GPS data is sent to the server during personal time.

## Problem Statement
Current tracking logic in the mobile app starts background and foreground location updates upon login and permission grant. It does not strictly gate these updates based on the rider's "On-Duty" status, which can lead to privacy concerns for riders during their off-hours.

## Proposed Solution: "Silent Mode" Duty Gating
Instead of unregistering the location task (which can be unreliable to restart), we will implement a client-side "Gate" that discards location data before it ever leaves the device if the rider is off-duty.

### 1. Background Task (TaskManager)
The background task (`background-location-task`) will be modified to check the `isOnDuty` status from `AsyncStorage` as its first action.

- **Status Check:** Use `AsyncStorage.getItem('@is_on_duty')`.
- **Gating Logic:** If the status is `false` or missing, the task will return immediately.
- **Privacy Guarantee:** No coordinates are processed, normalized, or sent via `updateLocationBackground` when off-duty.

### 2. Foreground Tracking (LocationContext)
The UI-level tracking will be updated to reactively start and stop based on the `isOnDuty` state.

- **Watch Toggle:** The `watchPositionAsync` subscription will be removed when `isOnDuty` is false and recreated when it becomes true.
- **Socket Gating:** The `publishSafeLocation` function will include a check: `if (!isOnDuty) return null;`.
- **Heartbeat Gating:** The heartbeat interval will only run if `isOnDuty` is true.

### 3. Authentication & Logout
- **Logout Sync:** Upon logout, the `logout` function in `AuthContext` already clears `@rider_id`. The background task will be updated to stop and exit if the rider identity is missing.
- **Clear Duty on Logout:** Explicitly set `@is_on_duty` to `false` during the logout sequence.

### 4. Admin & Real-Time Sync
- **Server Broadcasts:** The server's `/:id/duty` endpoint already emits `rider-status-updated` to the `admin-room`.
- **Instant Reflection:** Admin dashboards and maps will show the rider as "Off-Duty" or "Offline" immediately upon the toggle, maintaining existing real-time behavior.

## Technical Components

### Mobile App (`mobile-app/context/LocationContext.tsx`)
- Update `LOCATION_TASK_NAME` definition to read duty status.
- Update `publishSafeLocation` and `sendHeartbeat` to gate on `isOnDuty`.
- Update `useEffect` (permission and setup) to manage foreground subscription lifecycle based on `isOnDuty`.

### Authentication (`mobile-app/context/AuthContext.tsx`)
- Ensure `@is_on_duty` is cleared/set to false on logout.

## Success Criteria
- [ ] No location data is sent to the server when the rider is Off-Duty.
- [ ] No location data is sent to the server after the rider logs out.
- [ ] Tracking resumes instantly when the rider goes back On-Duty.
- [ ] Admin pages show the correct status transition immediately.

## Testing Plan
- **Unit Test:** Mock `AsyncStorage` and verify the TaskManager exits early when off-duty.
- **Integration Test:** Observe network logs in a development build to confirm zero outgoing location requests when off-duty.
- **E2E Test:** Toggle duty status in the app and verify the "Offline/Off-Duty" status appears on the Admin tracking map.
