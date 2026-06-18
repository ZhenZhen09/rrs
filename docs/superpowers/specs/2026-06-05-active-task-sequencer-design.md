# Active Task Sequencer Design Spec (The "Live Interceptor")

**Status:** Finalized (Awaiting Implementation)  
**Date:** 2026-06-05  
**Objective:** Eliminate cherry-picking by giving Admins manual, real-time control over the rider's physical task sequence.

---

## 1. Functional Overview

### 1.1 Multi-Phase Control
- **Phase A (Approval)**: Batch or single approval triggers the Sequencer.
- **Phase B (Live Management)**: A "Manage Route" button in the Active Tab allows re-ordering tasks that are already in the rider's hands.

### 1.2 "Option A" Workflow (Single Approval)
When an Admin clicks "Approve" on one pending task:
1. System checks the target rider's current active tasks.
2. The **Active Sequencer Modal** opens immediately.
3. The Admin drags the new task into the desired position (1st, 2nd, etc.).
4. Clicking "Confirm" saves the entire new sequence and assigned the task.

### 1.3 Rider Enforcement
- Only Task #1 (excluding `in_progress`) is active on the mobile app.
- All subsequent tasks are locked.
- **Push Notification**: "Admin has updated your route. Check your new sequence."

---

## 2. Technical Architecture

### 2.1 Backend API
- `POST /api/requests/resequence`
  - Payload: `{ riderId: string, sequence: string[], note: string }`
  - Logic: Updates `queue_order` for all IDs in the array atomically.
  - Broadcast: Emits `rider-status-updated` and a specific `route-optimized` socket event.

### 2.2 Data Model Updates
- Add `last_resequence_at` (TIMESTAMP) to the `users` table to track route stability.
- Ensure `movement_events` logs the specific sequence change for Layer 4 audit.

---

## 3. UI/UX Specifications

### 3.1 The "Mission Anchor"
- Background: `#EFF6FF` (Blue-50)
- Icon: Pulsing Emerald dot next to "IN ROUTE".
- Content: The task currently being executed by the rider (Fixed at top).

### 3.2 The Sequencer List
- Component: `Framer Motion <Reorder.Group>`
- Indicators: 
  - `[1]`, `[2]`, `[3]` indices.
  - SLA Shield Priority Scores (1-100).
  - Department Badges (Finance, Regulatory, etc.).

---

## 4. Testing & QA Matrix

| Case | Scenario | Expected |
| :--- | :--- | :--- |
| **New Task Add** | Approve 1 task while rider has 2 active. | Modal opens with 3 tasks; Admin moves new task to #1. |
| **Rider Lock** | Admin moves Task #3 to #1. | Rider phone vibrates; old Task #1 locks; new Task #1 unlocks. |
| **Mission Protection** | Try to drag a task that is "In Progress". | UI blocks drag; Mission task remains anchored at #0. |
