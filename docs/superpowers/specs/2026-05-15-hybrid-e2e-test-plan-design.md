# Hybrid E2E Test Plan Design: Full System Lifecycle

## Overview
This document outlines the design for a unified end-to-end (E2E) testing strategy for the Rider Scheduling & Delivery System. It bridges the Gap between Web (Personnel/Admin) and Mobile (Rider) using a hybrid approach to accommodate hardware constraints (slow emulator).

**Goal:** Verify a single delivery request can move through its entire lifecycle:
`Personnel Creation -> Admin Approval/Assignment -> Rider Execution (API) -> Mobile UI Visibility (Maestro)`

## Architecture
The system uses three specialized tools coordinated by a shared data artifact.

1.  **Playwright (Web Orchestrator):**
    -   Handles complex UI interactions for Personnel (Sign up/Request) and Admin (Approval/Assignment).
    -   Generates a `test-session.json` artifact containing the `request_id` and auth tokens.
2.  **API Simulation (Rider Logic):**
    -   Uses direct HTTP calls to transition the `delivery_status` (e.g., `assigned -> in_progress -> completed`).
    -   Validates backend business logic and BOLA protection without UI overhead.
3.  **Maestro (Mobile UI Validator):**
    -   Performs targeted UI checks on the Android Emulator.
    -   Verifies that the request state updated via API is correctly reflected in the Mobile App UI.

## Components & Data Flow

### 1. Web Phase (Playwright)
- **Role: Personnel**
  - Login to Personnel Portal.
  - Create a new delivery request with Map selection.
  - Assert request appears in history as `submitted_waiting`.
- **Role: Admin**
  - Login to Dispatch Console.
  - Approve the request and assign it to `rider1@company.com`.
  - Assert status changes to `approved` / `assigned`.
- **Artifact Generation**
  - Save `request_id` to `test-results/hybrid-e2e-session.json`.

### 2. Logic Phase (API / Node.js)
- **Role: Rider (Simulated)**
  - Authenticate as `rider1@company.com`.
  - Fetch the `request_id` from the artifact.
  - PUT `/api/requests/:id/status` to `in_progress`.
  - PUT `/api/requests/:id/status` to `completed`.
  - Verify status change in DB via `verify-transition-final.cjs` pattern.

### 3. Mobile Phase (Maestro)
- **Role: Rider (UI)**
  - Launch app on Emulator.
  - Login.
  - Navigate to "Today's Tasks".
  - Assert the specific `request_id` or Recipient Name is visible and has correct status.

## Success Criteria
- Request successfully transitions from `submitted_waiting` to `completed`.
- Data integrity maintained across all three application layers (Personnel UI, Admin UI, Rider API).
- Mobile UI correctly renders real-time status updates.

## Technical Constraints
- **Emulator Performance:** Maestro flows will be kept "lean" (minimal taps, high timeouts) to avoid failures due to slowness.
- **Port Mapping:** Web (5174), API (3001), and Mobile (Metro/Emulator) must be reachable simultaneously.
