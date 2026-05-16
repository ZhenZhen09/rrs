# Removal of Automatic Geofence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cleanly remove the automatic backend geofence trigger logic while maintaining the high-frequency tracking optimization near destinations.

**Architecture:** 
- **Backend Cleanup:** Strip geofence distance checks from `locationTracking.ts`.
- **E2E Alignment:** Update Playwright tests to no longer expect automatic status transitions.

**Tech Stack:** Node.js, Playwright

---

### Task 1: Backend Cleanup - Remove Geofence Logic

**Files:**
- Modify: `server/locationTracking.ts`

- [ ] **Step 1: Remove `GEOFENCE_RADIUS_M` and `GEOFENCE_CHECK_INTERVAL_MS` constants.**
- [ ] **Step 2: Remove the geofence check block in `handleRiderLocationUpdate`.**

```typescript
// REMOVE THIS BLOCK:
if (
  shouldCheckGeofence &&
  request.delivery_status === 'in_progress' &&
  distanceToDropoff <= GEOFENCE_RADIUS_M
) {
  await pool.execute(
    'UPDATE delivery_requests SET delivery_status = ? WHERE request_id = ?',
    ['arrived', normalizedRequestId],
  );
  io?.to(`job_${normalizedRequestId}`).emit('job-status-changed', {
    requestId: normalizedRequestId,
    status: 'arrived',
  });
}
```

- [ ] **Step 3: Remove `geofenceCheckedAt` from `LocationState` interface and its usage in the state update.**
- [ ] **Step 4: Commit.**

---

### Task 2: Align E2E Tests with Simplified Flow

**Files:**
- Modify: `tests/location-tracking-validation.spec.ts`
- Modify: `tests/hybrid-e2e-lifecycle.spec.ts`

- [ ] **Step 1: Update `location-tracking-validation.spec.ts` to expect status to remain `in_progress` even at drop-off.**
- [ ] **Step 2: Update `hybrid-e2e-lifecycle.spec.ts` to remove the "Trigger Geofence" step.**
- [ ] **Step 3: Run tests to verify logic and tracking (3s interval) still work.**

---

### Task 3: Final Verification

- [ ] **Step 1: Run `npx playwright test tests/location-tracking-validation.spec.ts`.**
- [ ] **Step 2: Verify no "arrived" status is triggered in logs.**
- [ ] **Step 3: Confirm final delivery can still be manually completed via API/UI.**
