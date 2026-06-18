# Implementation Plan: Absence Conflict Management

## 1. Objectives
*   Prevent accidental assignment of absent/on-leave riders.
*   Provide a persistent hub for Admins to identify and resolve task conflicts caused by absences.
*   Automate mass re-assignment and rescheduling with proactive notifications to all stakeholders.

## 2. Server-Side Implementation

### 2.1 New Route: `POST /api/requests/mass-update`
*   **Location**: `server/routes/requests.ts`
*   **Logic**:
    *   Wrapped in a database transaction.
    *   **Action: `reassign`**:
        1.  Updates `assigned_rider_id`, `assigned_rider_name`, `status = 'approved'`, `delivery_status = 'assigned'`.
        2.  Notifies the **New Rider** about the assignment.
        3.  Notifies the **Personnel (Requester)**: *"Your request #XXXX has been reassigned to [New Rider] due to a schedule change."*
    *   **Action: `reschedule`**:
        1.  Updates `delivery_date`, clears assigned rider fields, sets `status = 'pending'`, `delivery_status = NULL`.
        2.  Notifies the **Personnel (Requester)**: *"Your request #XXXX has been rescheduled to [New Date]."*
*   **Audit Logging**: Every mass action is recorded in the audit logs.

### 2.2 Attendance Status Enrichment
*   Modify `GET /api/users/attendance/daily` (or the underlying query in `users.ts`) to ensure it returns `active_task_count` for the specified date (currently it seems to return for 'today').

## 3. Frontend Implementation (Admin)

### 3.1 Layer 1: The "Assignment Shield" (Prevention)
*   **Target**: `src/app/pages/Admin/DispatchConsole.tsx` and `RiderSelectionList.tsx`.
*   **Change**: Fetch attendance status for the selected task's `delivery_date`.
*   **UI**: Riders marked 'absent' or 'on_leave' for that date are moved to the bottom, greyed out, and labeled `[UNAVAILABLE]`.

### 3.2 Layer 2: Conflict Hub (Reaction)
*   **Target**: `src/app/pages/Admin/AttendanceDashboard.tsx`.
*   **Change**: 
    *   Highlight rows in **Rose-50 (Red)** if `status` is 'absent'/'on_leave' AND `active_task_count > 0`.
    *   Add a prominent `[ Resolve Conflicts ]` button in the "Active Tasks" column for these rows.

### 3.3 Layer 3: Recovery Interface (Correction)
*   **Component**: `ConflictResolutionModal.tsx`.
*   **Features**:
    *   List all orphaned tasks for the selected rider and date.
    *   "Reassign Selected": Dropdown of available riders (filtered for availability on that date).
    *   "Reschedule Selected": Date picker for new delivery date.
    *   Checkbox selection for granular control.

## 4. Testing & Validation Plan
*   **Unit Test**: Verify `mass-update` logic correctly updates database fields and sends notifications.
*   **Integration Test**: Simulate a rider reporting absence and confirm the Attendance Dashboard correctly identifies the conflict.
*   **End-to-End**: Walk through the "Resolve Conflicts" flow to ensure Personnel see updated dates and receive notifications.

## 5. Security & Integrity
*   **Auth**: Route restricted to `admin` role only.
*   **BOLA**: Ensure re-assignment notifications only go to the specific requester of the task.
