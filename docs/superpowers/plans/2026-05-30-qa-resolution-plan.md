# QA Assessment Resolutions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 4 critical bugs and infrastructure failures discovered during the Rapid QA test so the test suite can pass successfully.

**Architecture:** We will adjust the authorization logic in the cancel route to return distinct HTTP status codes (403 for unauthorized access, 400 for grace period expiration). We will synchronize the E2E testing ports to the current frontend standard (5173). We will update the test suite's authentication payloads with valid database credentials. Finally, we will isolate the `mobile-app` directory from the root `vitest` runner by creating a dedicated `vitest.workspace.ts` configuration.

**Tech Stack:** Node.js, Express, Playwright, Vitest

---

### Task 1: Fix Business Logic Error Code for Grace Period

**Files:**
- Modify: `server/routes/requests.ts`

- [ ] **Step 1: Write the minimal implementation**

We need to separate the BOLA (Broken Object Level Authorization) check from the Grace Period timing check. Update the cancellation route (`router.put('/:id/cancel'`) authorization block.

```typescript
    // Replace this existing logic:
    // const isAuthorized = user.role === 'admin' || (user.role === 'personnel' && request.status === 'submitted_waiting' && (request.requester_id === user.id || request.requester_department === user.department));
    // 
    // if (!isAuthorized) {
    //   await conn.rollback();
    //   return res.status(403).json({ error: 'You do not have permission to cancel this request.' });
    // }

    // With the new logic:
    const isOwnerOrAdmin = user.role === 'admin' || 
      (user.role === 'personnel' && (request.requester_id === user.id || request.requester_department === user.department));
    
    if (!isOwnerOrAdmin) {
      await conn.rollback();
      return res.status(403).json({ error: 'You do not have permission to cancel this request.' });
    }

    if (user.role === 'personnel' && request.status !== 'submitted_waiting') {
      await conn.rollback();
      return res.status(400).json({ error: 'Cancellation window has expired. Only pending requests can be cancelled.' });
    }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx playwright test tests/personnel-lifecycle.spec.ts --project=chromium`
Expected: PASS (The test expects a 400 status code)

- [ ] **Step 3: Commit**

```bash
git add server/routes/requests.ts
git commit -m "fix(api): return 400 instead of 403 for expired cancellation grace period"
```

### Task 2: Fix E2E Port Mismatch (5174 -> 5173)

**Files:**
- Modify: `tests/hybrid-e2e-lifecycle.spec.ts`

- [ ] **Step 1: Write the minimal implementation**

Update the hardcoded port in the hybrid test to match the local Vite dev server port.

```typescript
// Find:
const WEB_BASE_URL = 'http://localhost:5174';

// Replace with:
const WEB_BASE_URL = 'http://localhost:5173';
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx playwright test tests/hybrid-e2e-lifecycle.spec.ts --project=chromium`
Expected: The test should no longer throw `ERR_CONNECTION_REFUSED` (though it may fail on authentication in the next step, the connection error will be gone).

- [ ] **Step 3: Commit**

```bash
git add tests/hybrid-e2e-lifecycle.spec.ts
git commit -m "test(e2e): sync hybrid e2e base url with vite default port 5173"
```

### Task 3: Fix Stale Test Credentials

**Files:**
- Modify: `tests/security-bola-prevention.spec.ts`
- Modify: `tests/hybrid-e2e-lifecycle.spec.ts` (if applicable)
- Modify: `tests/personnel-to-admin-lifecycle.spec.ts` (if applicable)

- [ ] **Step 1: Write the minimal implementation**

Update the hardcoded passwords for the test users to match the current database state.

In `tests/security-bola-prevention.spec.ts`:
```typescript
// Find:
    const hrLogin = await request.post('/api/auth/login', {
      data: { email: 'john.hr@company.com', password: 'john' }
    });

// Replace with:
    const hrLogin = await request.post('/api/auth/login', {
      data: { email: 'john.hr@company.com', password: 'Hon010125@' }
    });
```
*(Perform a similar search and replace across the `tests/` directory for any other instances where `password: 'john'` is used alongside the `john.hr@company.com` email).*

- [ ] **Step 2: Run test to verify it passes**

Run: `npx playwright test tests/security-bola-prevention.spec.ts --project=chromium`
Expected: PASS (The authentication step should succeed and the BOLA logic should be correctly tested).

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: update hardcoded test user credentials to match database"
```

### Task 4: Resolve Vitest RolldownError for React Native

**Files:**
- Create: `vitest.workspace.ts` (at project root)

- [ ] **Step 1: Write the minimal implementation**

By default, running `vitest` in the root scans all directories. The `mobile-app` directory contains React Native code (with Flow types) that Vite's default parsers cannot handle. We need to explicitly tell Vitest at the root level to only run web-related tests.

Create a file named `vitest.workspace.ts` in the root directory:

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'web-unit',
      include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
      exclude: ['mobile-app/**'],
      environment: 'node',
    },
  }
]);
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run`
Expected: The test runner should only execute the 4 unit tests in `tests/unit/` and should completely bypass the `mobile-app` directory, eliminating the `RolldownError`.

- [ ] **Step 3: Commit**

```bash
git add vitest.workspace.ts
git commit -m "chore(test): isolate root vitest runner from react-native mobile app code"
```