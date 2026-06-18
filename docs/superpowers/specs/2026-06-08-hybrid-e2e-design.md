# Hybrid E2E Testing Strategy: Rider Scheduling System

## Objective
Establish a comprehensive, read-only hybrid E2E testing framework to validate complex state synchronization between the Admin Dispatch Console (Web) and the Rider Application (Mobile), encompassing SLA sorting, active task management, and duty cycles.

## Tech Stack
*   **Web Automation:** Playwright (Chromium)
*   **Mobile Automation:** Maestro (Android/iOS)
*   **Orchestration:** Node.js Wrapper Script (`hybrid-suite-runner.cjs`)
*   **Verification:** Direct Database/API assertions (where UI is insufficient) and Socket.IO event listening.

## Architecture & Execution Flow
The tests will run without modifying production code. A Node.js orchestrator will sequentially or concurrently trigger Playwright and Maestro tests, passing necessary context (like `jobId` or `riderId`) via temporary JSON artifacts.

1.  `npx playwright test ...` -> Executes Admin actions. -> Writes state to `temp-state.json`.
2.  Orchestrator reads `temp-state.json`.
3.  `maestro test ... -e JOB_ID=xxx` -> Executes Mobile verification based on Web actions.

## Exhaustive Test Cases

### 1. Dispatch Console & SLA Sorting
*   **TC-1.1: SLA Priority & Calendar UI:**
    *   Create 3 jobs with different dates/windows.
    *   **Verify:** "Pending" tab displays calendar-like (day of the week) visuals correctly.
    *   **Verify:** "Pending" tab sorts Oldest + Earliest Window first.
*   **TC-1.2: Active-First Rule:** Verify jobs with `status='approved'` float to the top above `pending` in the "All" view.
*   **TC-1.3: Real-Time Injection:** Admin viewing console -> API creates new job -> Verify UI updates instantly (Socket check).

### 2. State Sync & Active Tasks (Web ↔ Mobile)
*   **TC-2.1: Instant Assignment:** Rider on Mobile (Duty ON). Admin assigns job. Verify Mobile list updates instantly (no refresh).
*   **TC-2.2: Admin Resequence:** Rider has Jobs A, B, C. Admin reorders to C, A, B. Verify Mobile UI instantly shifts to C, A, B.
*   **TC-2.3: Admin Remote Complete:** Rider loses connection. Admin marks job "Completed". Verify job moves to "Done" and drops from Rider's active list when connection returns.
*   **TC-2.4: Mass Reassign (Batch):** Admin selects 3 jobs, assigns to Rider simultaneously. Verify Rider gets all 3 with correct queue order.

### 3. Edge Cases & Deviation Management
*   **TC-3.1: Terminal State Lock:** Rider marks job `delivered`. Rider attempts network replay to change status to `failed`. Verify API 400s (Terminal Lock).
*   **TC-3.2: Deviation Request:** Rider requests sequence skip -> Admin gets alert -> Admin approves -> Verify queue order updates on both ends.
*   **TC-3.3: Cancellation Window:** Admin cancels job while Rider is en route. Verify Rider gets `assignment_cancelled` socket event and job drops.

### 4. Duty Cycle Security
*   **TC-4.1: Duty OFF Hides Data:** Rider goes Duty OFF. Verify Mobile UI hides active tasks (API returns `offDuty: true`).
*   **TC-4.2: Admin Assign to Offline:** Rider Duty OFF. Verify Admin UI blocks or warns when trying to assign to this Rider.
*   **TC-4.3: Duty ON Restore:** Rider goes Duty ON. Tasks instantly return.
