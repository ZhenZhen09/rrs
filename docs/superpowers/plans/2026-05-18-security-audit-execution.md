# Security Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conduct a comprehensive, non-destructive security audit of `https://rrs-vhgr.onrender.com/` to identify vulnerabilities against human and AI-driven attacks.

**Architecture:** Use a diagnostic-first approach. Analyze source code logic for authorization gaps (SAST) and perform lightweight, non-destructive probing of the production API (DAST) to verify findings.

**Tech Stack:** `curl`, `chrome-devtools-mcp`, `grep_search`, `node_modules/typescript`

---

### Task 1: API Authorization Audit (BOLA/BFLA)

**Files:**
- Modify (Verify): `server/routes/requests.ts`
- Modify (Verify): `server/routes/users.ts`
- Test: `tests/security-bola-prevention.spec.ts`

- [ ] **Step 1: Analyze Request Authorization Logic**
  Grep for `req.params.id` usage in `server/routes/requests.ts` and verify that every database query includes a `WHERE assigned_rider_id = ?` or role check.
- [ ] **Step 2: Probing Production (Non-Admin BFLA)**
  Use `curl` to attempt a `GET /api/users` request using a non-admin token (or no token) and verify it returns 401/403.
- [ ] **Step 3: Run existing BOLA validation tests**
  Run: `npx playwright test tests/security-bola-prevention.spec.ts`
  Expected: All tests PASS.

### Task 2: Session & JWT Hardening

**Files:**
- Modify (Verify): `server/index.ts`
- Modify (Verify): `server/middleware/auth.ts`

- [ ] **Step 1: Verify Cookie Flags**
  Use `curl -I` on the production login endpoint to check for `HttpOnly`, `Secure`, and `SameSite` flags.
- [ ] **Step 2: JWT Integrity Check**
  Inspect `server/middleware/auth.ts` to ensure `jsonwebtoken.verify` is called with the correct secret and that `alg` is not set to 'none'.
- [ ] **Step 3: Rate Limiting Verification**
  Check `server/index.ts` or `server/routes/auth.ts` for `express-rate-limit` implementation on login routes.

### Task 3: Socket.io Room & Event Security

**Files:**
- Modify (Verify): `server/index.ts`
- Modify (Verify): `server/presence.ts`

- [ ] **Step 1: Analyze Room Join Logic**
  Inspect `io.on('connection')` in `server/index.ts` to ensure `socket.join(userID)` only happens after verifying the `userID` matches the authenticated session.
- [ ] **Step 2: Spoofing Prevention**
  Verify that `update-location` handlers check that the `riderId` in the event payload matches the `riderId` in the socket's authenticated data.

### Task 4: Injection & CSP Audit

**Files:**
- Modify (Verify): `server/index.ts`
- Modify (Verify): `index.html`

- [ ] **Step 1: SQL Injection Probing**
  Identify any raw string concatenation in `server/` database queries.
- [ ] **Step 2: Security Header Check**
  Use Chrome DevTools to list headers for the main page and verify `Content-Security-Policy` and `Strict-Transport-Security`.

### Task 5: Final Report Generation

- [ ] **Step 1: Synthesize Findings**
  Collate all vulnerabilities found in Tasks 1-4 into a final markdown report.
- [ ] **Step 2: Propose Remediations**
  For every High/Critical finding, provide the specific code fix.
