# Spec: Synchronizing Calendar Status with Dispatch Console

## 1. Goal
Align the `CalendarView` status categories, labels, and colors with the logic used in the `DispatchConsole` tabs to ensure administrative consistency across the system.

## 2. Status Mapping Logic

The system will transition from technical DB statuses to grouped UI statuses:

| UI Status | DB `status` | DB `delivery_status` | Color | Dispatch Tab |
| :--- | :--- | :--- | :--- | :--- |
| **PENDING** | `pending` | - | Yellow (`#f59e0b`) | Pending |
| **ACTIVE** | `approved` | `assigned`, `in_progress` | Green (`#10b981`) | Active |
| **DONE** | - | `completed` | Neutral (`#94a3b8`) | Completed |
| **FAILED** | `disapproved` | `failed` | Red (`#ef4444`) | Completed |

## 3. UI Changes

### A. Header Legend
- Remove "In Transit" and "Critical".
- Add "Done" and "Failed".
- Final set: **Active (Green), Pending (Yellow), Done (Slate), Failed (Red)**.

### B. Sidebar Filters
- The filter list will be updated to: **Pending, Active, Done, Failed**.
- Toggling "Active" will show requests that are `approved` but not yet terminal.

### C. List & Calendar Cells
- Badges and dots will reflect the new mapping.
- "Active" will be the primary label for any ongoing job (Assigned, In Progress, etc.).
- "Done" will have a muted, professional look.

## 4. Technical Implementation
- Refactor `filteredRequests` useMemo to include a grouping helper.
- Update `activeFilters` initial state to use the new UI keys.
- Replace manual status checks in `CalendarTaskRow` and `IndustrialListView` with the centralized mapping logic.
