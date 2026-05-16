# Hybrid E2E Test System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a unified E2E test suite that verifies the full lifecycle (Personnel -> Admin -> Rider API -> Mobile UI) and specifically validates real-time location tracking and geofencing.

**Architecture:** 
- **Orchestrator:** Playwright (Node.js)
- **Web UI:** Personnel & Admin Dashboards
- **Rider Simulation:** Direct HTTP API calls (via `playwright.request`)
- **Mobile UI:** Maestro (Android Emulator) triggered via shell from Playwright
- **Tracking:** Automated GPS sequence injection to verify geofence triggers

**Tech Stack:** Playwright, Maestro, Node.js, MySQL

---

### Task 1: Foundation - Shared Session Artifact & Environment Setup

**Files:**
- Create: `tests/utils/session-manager.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Create session manager to store Request IDs across tool boundaries**

```typescript
import fs from 'fs';
import path from 'path';

export const SESSION_FILE = path.join(process.cwd(), 'test-results/e2e-session.json');

export function saveSession(data: any) {
  if (!fs.existsSync(path.dirname(SESSION_FILE))) fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

export function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) return null;
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
}
```

- [ ] **Step 2: Update Playwright config to include the new E2E spec**
- [ ] **Step 3: Commit**

---

### Task 2: Implement Unified E2E Spec (Web + API Phases)

**Files:**
- Create: `tests/hybrid-e2e-lifecycle.spec.ts`

- [ ] **Step 1: Write Personnel Request Creation (Web)**
- [ ] **Step 2: Write Admin Approval & Rider Assignment (Web)**
- [ ] **Step 3: Write Rider "Start Delivery" (API)**
- [ ] **Step 4: Save `request_id` and `auth_token` to session artifact**

```typescript
// Example snippet for Task 2
test('Full Lifecycle: Personnel -> Admin -> Rider API', async ({ page, request }) => {
  // 1. Personnel creates request
  const requestId = await createRequestAsPersonnel(page); 
  // 2. Admin approves and assigns rider_001
  await approveAsAdmin(page, requestId, 'rider_001');
  // 3. Simulate Rider Start via API
  const riderToken = await getRiderToken('rider1@company.com');
  const response = await request.put(`/api/requests/${requestId}/status`, {
    data: { status: 'in_progress', remark: 'Starting E2E delivery' },
    headers: { 'Cookie': `authToken=${riderToken}` }
  });
  expect(response.ok()).toBeTruthy();
  saveSession({ requestId, riderToken });
});
```

---

### Task 3: Implement Live Tracking & Geofence Validation

**Files:**
- Create: `tests/location-tracking-validation.spec.ts`

- [ ] **Step 1: Inject sequence of GPS coordinates towards drop-off point**
- [ ] **Step 2: Verify `current_lat/lng` updates in `delivery_requests` table**
- [ ] **Step 3: Verify "Arrived" geofence trigger (200m radius) via API status check**

```typescript
test('Location: Verify Geofence "Arrived" status trigger', async ({ request }) => {
  const { requestId, riderToken } = loadSession();
  // Send location 150m from drop-off
  await request.post('/api/users/location', {
    data: { lat: DROP_OFF_LAT + 0.001, lng: DROP_OFF_LNG + 0.001, requestId },
    headers: { 'Cookie': `authToken=${riderToken}` }
  });
  // Wait for background processing
  await page.waitForTimeout(2000);
  // Check if status changed to 'arrived' automatically
  const statusRes = await request.get(`/api/requests/${requestId}`);
  const data = await statusRes.json();
  expect(data.delivery_status).toBe('arrived');
});
```

---

### Task 4: Mobile UI Verification (Maestro Hook)

**Files:**
- Create: `.maestro/e2e-visibility-check.yaml`
- Modify: `tests/hybrid-e2e-lifecycle.spec.ts` (Add Maestro trigger)

- [ ] **Step 1: Create Maestro flow that asserts Visibility of specific Request ID**
- [ ] **Step 2: Add `exec` call in Playwright to run Maestro on emulator**

```typescript
// Inside hybrid-e2e-lifecycle.spec.ts
test('Mobile: Verify visibility on Emulator', async () => {
  const { requestId } = loadSession();
  const result = execSync(`maestro test .maestro/e2e-visibility-check.yaml -e REQUEST_ID=${requestId}`);
  expect(result.toString()).toContain('SUCCESS');
});
```

---

### Task 5: Final Validation & Bug Report Generation

- [ ] **Step 1: Run full suite: `npx playwright test tests/hybrid-e2e-lifecycle.spec.ts`**
- [ ] **Step 2: Document any failures (e.g., location update interval issues, role permission bugs)**
- [ ] **Step 3: Write `TEST_REPORT_E2E_HYBRID_2026-05-15.md`**
