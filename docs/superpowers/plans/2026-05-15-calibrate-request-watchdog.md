# Calibrate Request Watchdog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calibrate Request Watchdog (BUG 06) for more responsive signal loss detection.

**Architecture:**
- Update `RequestWatchdog` interval to 30s.
- Enhance `check()` logic to accurately detect and clear `signal_lost` exceptions.
- Add logging for debugging.

**Tech Stack:** Node.js, Express, Socket.io, MySQL (pool).

---

### Task 1: Update RequestWatchdog Interval and Logic

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Update start() interval**

Change from 60000 to 30000.

- [ ] **Step 2: Add logging to check()**

Add logs to track when watchdog runs and what it detects.

- [ ] **Step 3: Review and ensure exception clearing logic is robust**

Ensure `signal_lost` is cleared when `isOnline` is true.

- [ ] **Step 4: Commit**

```bash
git add server/index.ts
git commit -m "fix(server): calibrate RequestWatchdog for 30s interval and improve logging"
```

### Task 2: Verification

**Files:**
- Run: `tests/deep-rapid-check.spec.ts`

- [ ] **Step 1: Run the robustness test**

Run: `npx playwright test tests/deep-rapid-check.spec.ts --project=chromium --grep "ROBUSTNESS"`
Expected: PASS and check logs for watchdog activity.
