# Privacy-Focused Location Duty Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent location data from being sent to the server when a rider is off-duty or logged out, while maintaining system-level "Always" permissions.

**Architecture:** Implement a "Silent Mode" gate in the mobile app. The background TaskManager and foreground LocationContext will check the `@is_on_duty` flag in AsyncStorage before processing or sending coordinates.

**Tech Stack:** React Native, Expo Location, TaskManager, Socket.io, AsyncStorage.

---

### Task 1: Gate the Background Task

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx`

- [ ] **Step 1: Update TaskManager definition to check duty status.**
The background task should exit immediately if the rider is not on-duty or if their identity is missing.

```typescript
// Replace the start of TaskManager.defineTask
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (hasStoppedBackgroundTask || isStoppingBackgroundTask) {
    return;
  }

  // --- PRIVACY GATE: Check Duty Status ---
  try {
    const dutyStatus = await AsyncStorage.getItem(STORAGE_DUTY_STATUS);
    if (dutyStatus !== 'true') {
      // Exit silently: task wakes up but does nothing
      return;
    }
  } catch (err) {
    return;
  }
  
  if (error) {
    // ... rest of existing error handling
```

- [ ] **Step 2: Commit.**
```bash
git add mobile-app/context/LocationContext.tsx
git commit -m "feat(location): gate background task on duty status"
```

---

### Task 2: Gate Foreground Tracking and Heartbeats

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx`

- [ ] **Step 1: Update publishSafeLocation to gate on isOnDuty.**

```typescript
// Inside publishSafeLocation
const publishSafeLocation = useCallback(async (
  safeLocation: NonNullable<ReturnType<typeof normalizeLocation>>,
  source: 'initial' | 'watch' | 'manual',
  requestIdOverride?: string,
) => {
  // --- PRIVACY GATE: Double-check isOnDuty flag ---
  if (!user?.id || !isOnDuty) {
    console.log(`[LocationContext] Suppressing ${source} update: User is ${!user?.id ? 'unauthenticated' : 'off-duty'}`);
    return null;
  }
  // ... rest of function
```

- [ ] **Step 2: Update foreground subscription lifecycle.**
Modify the main setup `useEffect` to react to `isOnDuty` changes.

```typescript
// In the setup useEffect (the one with [publishSafeLocation, user?.id, user?.role])
useEffect(() => {
  if (user?.role !== 'rider') return;
  
  // ADD THIS: Clear any existing subscription if off-duty
  if (!isOnDuty) {
    if (foregroundSubscription.current) {
      foregroundSubscription.current.remove();
      foregroundSubscription.current = null;
    }
    return;
  }
  
  (async () => {
    // ... existing setup logic (AsyncStorage.setItem, permissions, etc.)
  })();
  // ...
}, [publishSafeLocation, user?.id, user?.role, isOnDuty]); // ADD isOnDuty to dependencies
```

- [ ] **Step 3: Commit.**
```bash
git add mobile-app/context/LocationContext.tsx
git commit -m "feat(location): gate foreground tracking and heartbeats on duty status"
```

---

### Task 3: Ensure Duty Clears on Logout

**Files:**
- Modify: `mobile-app/context/AuthContext.tsx`

- [ ] **Step 1: Set duty status to false in the logout sequence.**

```typescript
// Inside logout function in AuthProvider
const logout = async () => {
  try {
    await api.post('/api/auth/logout', { userId: user?.id });
  } catch (e) {}
  await AuthManager.clearSession();
  
  // --- PRIVACY SYNC: Clear duty status ---
  await AsyncStorage.setItem('@is_on_duty', 'false');
  
  await AsyncStorage.multiRemove(['@rider_id', '@active_request_id']);
  resetAuthStatus();
  setToken(null);
  setUser(null);
};
```

- [ ] **Step 2: Commit.**
```bash
git add mobile-app/context/AuthContext.tsx
git commit -m "feat(auth): clear duty status on logout"
```

---

### Task 4: Verification

- [ ] **Step 1: Manual Verification (Developer Mode).**
1. Log in as a rider.
2. Go "On-Duty". Verify (via console logs or network tab) that `update-location` events are sent.
3. Go "Off-Duty". Verify that `update-location` events stop immediately.
4. Minimize the app while "Off-Duty". Verify (via console logs if possible or by checking the admin dashboard) that the location does not update.
5. Go "On-Duty" again. Verify tracking resumes instantly.
6. Log out. Verify that the location stops updating on the admin dashboard.
