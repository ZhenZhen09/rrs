# Operational Governance Engine: Architecture Plan

## Problem Statement
The current system allows for an "Operational Agency Problem" where riders manipulate their schedules for personal convenience. Observed behaviors include:
1.  **Tactical Leaves:** Requesting leave immediately after seeing a heavy schedule for the next day.
2.  **Cherry-Picking:** Prioritizing low-value tasks (e.g., HR) over high-value tasks (e.g., Finance) due to personal relationships or proximity.
3.  **False Alibis:** Claiming "traffic" or "nearness" to justify skipping priority assignments.

## Solution: The 4-Layer Architecture

### Layer 1: Visibility Control (The "Blindfold" Strategy)
**Objective:** Stop riders from executing "tactical leaves" by controlling schedule visibility.
*   **Logic:** Riders are blocked from seeing any requests where `delivery_date > CURRENT_DATE`.
*   **Mobile UI Access Control:** Implement a **"Conditional Lock"** on the existing "Upcoming" tab for the Rider role. The tab itself will **not** be removed from the code to ensure app stability. Instead, the task list will be replaced with a `LockedStateView`:
    *   **Icon:** Padlock with a "06:00" clock face.
    *   **Message:** *"Schedule is under lock. Tomorrow's missions will be revealed at 06:00 AM after your morning check-in."*
*   **The "Next-In-Line" Limit:** Limit the current day's view to the top 2 tasks (Current + Next). Details (address, contact) for tasks at `queue_order > 2` are redacted/blurred to prevent long-term route manipulation.

### Layer 2: Sequential Enforcement (The "Interceptor")
**Objective:** Force the rider to execute tasks in the exact order determined by the Admin.
*   **Admin UI (Batch & Sequence):** 
    *   In the **Pending Tab**, Admins select tasks via checkboxes.
    *   Clicking **[ Approve ]** opens the `EnhancedBatchApproveModal`.
    *   **AI Suggestion:** Tasks are automatically sorted (1, 2, 3) using weights from Layer 3.
    *   **Manual Override:** Admins use drag-and-drop to finalize the order.
*   **Rider App Enforcement:**
    *   Only Task #1 is "Active." "Arrived" and "Complete" buttons are **disabled** for all other tasks.
    *   **Sequence Deviation Request:** To skip a task, the rider must click a button, select a reason (Traffic, Road Block, etc.), and **upload a mandatory photo alibi**.
    *   **Admin Alert:** Real-time socket notification triggers for any deviation request.

### Layer 3: Departmental Priority Weighting (The "SLA Shield")
**Objective:** Mathematically prove and enforce that certain departments have higher priority.
*   **System Weights:** `Finance: 10.0`, `Regulatory: 7.0`, `Operations: 4.0`, `HR/Admin: 1.0`.
*   **AI Sorting Formula:** `Priority_Score = (Department_Weight) * (Urgency_Weight) - (Hours_to_SLA_Expiry)`.
*   **Enforcement:** Triggers a **"Priority Gap Alert"** if a rider is within 1km of a High-Weight task but heads toward a Low-Weight one.

### Layer 4: Behavioral Analytics (The "Discipline Hub")
**Objective:** Provide undeniable, matrix-based data to justify performance reviews and disciplinary actions.
*   **Location:** New **"Operational Integrity"** tab in the Analytics Hub.
*   **The 4 Data Matrices:**
    1.  **Tactical Leave Correlation:** Flags "Sick Leave" reported < 60 mins after a rider views a heavy schedule (Workflow viewed timestamp log).
    2.  **Departmental Bias Matrix:** Proves favoritism by showing success rates per department (e.g., 100% for HR vs 30% for Finance).
    3.  **Sequence Deviation Log:** Logs all "Swap" requests, alibis, and GPS-based verification of those alibis.
    4.  **Ghost Miles Efficiency:** Overlays "Admin Planned Route" vs "Rider Actual Route" to highlight wasted fuel/time spent on unauthorized route changes.
*   **Integrity Score (0-100%):** A master KPI displayed as a **Discipline Badge** (Green/Yellow/Red) in the Attendance Dashboard.

---
*Implementation Order: Layer 1 (Immediate restriction) -> Layer 3 (Database rules) -> Layer 2 (Admin UI Refactor) -> Layer 4 (Analytics UI).*
