# Deep Testing Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the critical race conditions, watchdog delays, and security gaps identified in the `TEST_REPORT_DEEP_TESTING_2026-05-15.md`.

**Architecture:** 
- **Concurrency:** Use MySQL Transactions and `SELECT ... FOR UPDATE` to ensure atomic rider assignments.
- **Reliability:** Refactor `RequestWatchdog` for faster polling and cleaner exception state management.
- **Security:** Expand the "Secure Query" pattern to departmental count and availability endpoints.

**Tech Stack:** Node.js, Express, MySQL

---

### Task 1: Fix Concurrent Assignment Race (BUG 05)

**Files:**
- Modify: `server/routes/requests.ts`

- [ ] **Step 1: Refactor `PUT /:id/approve` to use a database transaction.**
- [ ] **Step 2: Add a "Double-Assignment Check" using `FOR UPDATE`.**

```typescript
// Proposed Implementation:
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  
  // 1. Lock the row and check status
  const [rows]: any = await conn.execute(
    'SELECT status FROM delivery_requests WHERE request_id = ? FOR UPDATE',
    [id]
  );
  
  const currentStatus = rows[0]?.status;
  if (!currentStatus) throw new Error('NOT_FOUND');
  if (currentStatus === 'approved') throw new Error('ALREADY_APPROVED');

  // 2. Perform assignment
  await conn.execute(
    'UPDATE delivery_requests SET status = "approved", assigned_rider_id = ?, ... WHERE request_id = ?',
    [rider_id, ..., id]
  );

  await conn.commit();
} catch (err) {
  await conn.rollback();
  if (err.message === 'ALREADY_APPROVED') return res.status(409).json({ error: 'Request already assigned' });
  throw err;
} finally {
  conn.release();
}
```

- [ ] **Step 3: Run `tests/deep-rapid-check.spec.ts` and verify "Successful assignments: 1/2".**

---

### Task 2: Calibrate Request Watchdog (BUG 06)

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Reduce the interval from 60s to 30s.**
- [ ] **Step 2: Refactor the watchdog to handle the `exceptions` array more robustly.**
- [ ] **Step 3: Verify with `npx playwright test tests/deep-rapid-check.spec.ts` (Robustness test).**

---

### Task 3: Expand Security Isolation (BOLA+ Expansion)

**Files:**
- Modify: `server/routes/requests.ts`

- [ ] **Step 1: Update `GET /availability` to join with `delivery_requests` or strictly filter by `user.department`.**
- [ ] **Step 2: Update `GET /counts` (if not already strictly isolated) to ensure riders/personnel only count what they own.**
- [ ] **Step 3: Commit and run all security tests.**

---

### Task 4: Final Validation & Report Update

- [ ] **Step 1: Run full E2E suite.**
- [ ] **Step 2: Update `TEST_REPORT_DEEP_TESTING_2026-05-15.md` to reflect status "FIXED" for all bugs.**
