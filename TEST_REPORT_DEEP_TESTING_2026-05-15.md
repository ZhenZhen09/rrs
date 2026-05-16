# Deep Software Testing Report: Concurrency, Security & Robustness
**Date:** May 15, 2026
**System:** Rider Scheduling & Delivery System (RRS)
**Author:** Gemini CLI Agent

## 1. Deep Testing Summary
This phase subjected the RRS platform to "adversarial" conditions including simultaneous requests, cross-department API probing, and system watchdog simulations. While recent security hardening is effective, the system remains vulnerable to **High-Concurrency Race Conditions**.

## 2. Execution Matrix

| Domain | Scenario | Status | Finding |
| :--- | :--- | :--- | :--- |
| **Concurrency** | Simultaneous Assignment | 🔴 **FAIL** | Two riders assigned to one task. No conflict detection. |
| **Security** | BOLA+ API Probing | ✅ **PASS** | Cross-dept history access successfully blocked (403). |
| **Robustness** | Watchdog Logic | 🟡 **WARN** | Exception reporting failed to trigger in rapid check. |

---

## 3. Deep Bug Report

### 🔴 BUG 05: Concurrent Assignment Race (Overwriting)
**Impact:** Critical | **Category:** Data Integrity / Operations
- **Description:** When two admins assign different riders to the same request at the same microsecond, the system accepts **both** requests.
- **Evidence:** `tests/deep-rapid-check.spec.ts` reported "Successful assignments: 2/2". The last request simply overwrote the first in the DB.
- **Risk:** "Rider 1" may have already started driving while "Rider 2" is suddenly told the job is theirs. This causes major operational confusion and double-payout risks.
- **Fix Required:** Use a database transaction with `SELECT ... FOR UPDATE` or an optimistic lock (checking `version` or `updated_at`) to ensure only one assignment can occur.

### 🟡 BUG 06: Watchdog Reporting Delay
**Impact:** Medium | **Category:** Reliability
- **Description:** The `RequestWatchdog` logic for signal loss detection (`exceptions` column) did not reflect the 'signal_lost' state during the testing window.
- **Evidence:** Test case `ROBUSTNESS: Watchdog Logic Simulation` failed to detect the property update.
- **Risk:** Admins may believe a rider is active when they have actually lost connectivity or crashed.

---

## 4. Remediation Strategy

### Concurrency Fix (Priority 1)
Refactor `PUT /api/requests/:id/approve` to:
1. Start a MySQL Transaction.
2. Verify the `status` is still `'pending'` or `'submitted_waiting'`.
3. If already `'approved'`, return `409 Conflict`.
4. Commit assignment.

### Watchdog Calibration (Priority 2)
1. Reduce the `RequestWatchdog` interval from 60s to 30s for more responsive exception detection.
2. Add unit tests for the `RequestWatchdog` class logic independent of the API.

### Security Persistence (Priority 3)
1. Expand the "Secure Query" pattern used for location history to the `counts` and `availability` endpoints.
2. Implement a global `canAccessRequest(user, request)` utility in the DB layer.

---
**End of Deep Testing Report**
