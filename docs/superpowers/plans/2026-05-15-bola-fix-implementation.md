# BOLA Security Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden location tracking endpoints by enforcing authorization directly in SQL queries using the "Secure Query" pattern.

**Architecture:** 
- **Refactor:** Modify SQL queries in `server/routes/requests.ts` to include a `JOIN` with `delivery_requests` and departmental/role-based filters.
- **Verification:** Add a specialized E2E test file for security regression.

**Tech Stack:** Node.js, Express, MySQL, Playwright

---

### Task 1: Refactor Location History Endpoint

**Files:**
- Modify: `server/routes/requests.ts`

- [ ] **Step 1: Locate the `GET /:id/history` endpoint.**
- [ ] **Step 2: Replace the two-step verification with a single Secure Query.**

```typescript
// TARGET SQL LOGIC:
const [rows] = await pool.query(`
  SELECT ll.* 
  FROM location_logs ll
  JOIN delivery_requests dr ON ll.request_id = dr.request_id
  WHERE ll.request_id = ?
    AND (
      ? = 'admin' OR
      dr.assigned_rider_id = ? OR
      dr.requester_id = ? OR
      (dr.requester_department = ? AND dr.requester_department IS NOT NULL)
    )
  ORDER BY ll.timestamp ASC
`, [id, user.role, user.id, user.id, user.department]);
```

- [ ] **Step 3: Remove the old `reqCheck` logic and manual `if (user.role === ...)` checks.**
- [ ] **Step 4: Commit.**

---

### Task 2: Refactor Live Tracking Endpoint

**Files:**
- Modify: `server/routes/requests.ts`

- [ ] **Step 1: Locate the `GET /:id/tracking` endpoint.**
- [ ] **Step 2: Update the main `SELECT` query to include the same authorization filters.**
- [ ] **Step 3: Ensure the `canViewRequest` helper is either updated or replaced by the SQL-level check for consistency.**
- [ ] **Step 4: Commit.**

---

### Task 3: Security Verification Test

**Files:**
- Create: `tests/security-bola-prevention.spec.ts`

- [ ] **Step 1: Create a test that creates a request for 'Finance' department.**
- [ ] **Step 2: Log in as a Personnel user from 'HR' department.**
- [ ] **Step 3: Attempt to access `/api/requests/<finance_id>/history`.**
- [ ] **Step 4: Assert that the response returns 403 Forbidden or an empty array (depending on implementation choice).**
- [ ] **Step 5: Run tests and confirm fix.**
