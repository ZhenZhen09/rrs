# Software Quality Audit Report - Rider Scheduling System
**Date:** June 18, 2026
**Status:** ⚠️ Requires Maintenance / Optimization

## 1. Executive Summary
The system exhibits a sophisticated architecture with robust offline-first capabilities for mobile and real-time synchronization for dispatch. However, several **critical technical debts** and **security vulnerabilities** were identified during this non-destructive audit. The most pressing issues are potential memory leaks in the real-time tracking engine and a significant performance risk in the analytics module.

---

## 2. Critical Findings (High Risk)

### 🔴 2.1 Server Memory Leaks
The real-time tracking system utilizes several in-memory `Map` objects to maintain state for active requests and riders.
- **Problem:** `requestPingState`, `riderLatestState`, `requestLatestState`, and `requestGeofenceState` are populated when tracking begins but are **never pruned**.
- **Impact:** In a production environment with continuous operations, the server's heap memory will grow linearly with the number of requests and rider updates, eventually causing an **Out of Memory (OOM) crash**.
- **Location:** `server/index.ts` and `server/locationTracking.ts`.

### 🔴 2.2 Performance Bottleneck: Analytics Table Scan
The `GET /api/analytics/route-efficiency` endpoint performs a heavy query on the `location_logs` table.
- **Problem:** It selects all logs from the last 30 days without pagination, limits, or efficient aggregation.
- **Impact:** As the `location_logs` table grows (storing coordinates every 15-30s per rider), this query will become extremely slow, eventually timing out or causing the database/server to crash during the transfer of massive JSON payloads.
- **Location:** `server/routes/analytics.ts`.

---

## 3. Security & Logic Vulnerabilities (Medium Risk)

### 🟡 3.1 Unauthorized Notification Injection (BOLA/IDOR)
The notification creation endpoint lacks role-based authorization.
- **Problem:** `POST /api/notifications/` allows any authenticated user to send a notification to any `user_id`.
- **Impact:** A malicious user could spam other riders, personnel, or admins with fake system messages, potentially disrupting operations or conducting internal phishing.
- **Location:** `server/routes/notifications.ts`.

### 🟡 3.2 Cancellation Window Enforcement Mismatch
There is a discrepancy between the intended "60-second grace period" and the actual route logic.
- **Requirement:** Personnel should only cancel within 60 seconds of submission.
- **Issue:** The `cancel` route allows cancellation if the status is `submitted_waiting` OR `pending`. However, the system's Watchdog transitions requests to `pending` **only after** the 60s window has expired.
- **Impact:** Personnel can effectively cancel requests even after the grace period as long as they remain in the `pending` state.
- **Location:** `server/routes/requests.ts`.

---

## 4. Technical Debt & Maintenance

### 🔵 4.1 Schema Drift: `users` Table
- New columns `mobile_number` and `is_online` have been added to the database but are not yet integrated into the `PATCH /:id` or `POST /` user routes.
- `is_online` in the database is redundant/stale as the system relies on an in-memory Map for real-time presence.

### 🔵 4.2 High Log Noise: JWT Expiration
- The server logs are flooded with `jwt expired` errors. While the mobile app has recovery logic, the frequency suggests that the 1-hour access token TTL might be too short for background tracking operations, or the client-side proactive refresh is failing to trigger before the token dies.

### 🔵 4.3 Test Suite Fragility
- The existing test suite (Vitest/Playwright) is currently broken due to missing dependencies (`vitest`) and environment mismatches. It cannot be used as a "safety net" for production deployments in its current state.

---

## 5. Recommendations
1.  **Implement State Pruning:** Add logic to the `RequestWatchdog` to remove terminal requests (`completed`, `cancelled`, `failed`) from in-memory Maps.
2.  **Optimize Analytics Queries:** Implement pagination or daily pre-aggregation for location logs in the route efficiency reports.
3.  **Harden Notifications:** Restrict `POST /api/notifications` to the `admin` role or internal system calls only.
4.  **Align Cancellation Logic:** Update the `cancel` route to explicitly check the `created_at` timestamp against the grace period interval rather than relying on the `pending` status.
5.  **Restore Test Suite:** Fix `vitest` dependency issues and synchronize test credentials with the production/staging database schema.
