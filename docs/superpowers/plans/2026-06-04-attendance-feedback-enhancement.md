# Enhanced Attendance Feedback Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide visual feedback and a "Welcome Back" flow when checking attendance status.

**Tech Stack:** React Native, Expo, LocationContext.

---

### Task 1: Expose Refresh Logic in LocationContext

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx`

- [ ] **Step 1: Update LocationState type**
Add `refreshAttendance: () => Promise<AttendanceStatus>;` to the `LocationState` type definition.

- [ ] **Step 2: Refactor syncStatus and implement refreshAttendance**
Move `syncStatus` out of the `useEffect` and into the main component body as a `useCallback`. 
Implement `refreshAttendance` which calls `syncStatus` and returns the latest status.

- [ ] **Step 3: Update Provider value**
Include `refreshAttendance` in the `value` prop of `LocationContext.Provider`.

---

### Task 2: Implement "Welcome Back" UI & Logic

**Files:**
- Modify: `mobile-app/components/AttendanceLockout.tsx`

- [ ] **Step 1: Add Local State**
Add `isRefreshing` and `showWelcome` states to handle the transition.

- [ ] **Step 2: Update Check Status Button**
Replace the simple `onRefresh` call with a `handleCheckStatus` function. 
This function should:
1. Set `isRefreshing(true)`.
2. Call `refreshAttendance()` from context.
3. If the status is cleared (null) or 'present', set `showWelcome(true)` for 1.5s before the component unmounts.
4. If status is still restricted, show a temporary feedback message.

- [ ] **Step 3: Create "Welcome Back" Overlay UI**
Add a lively, full-screen overlay (using absolute positioning or a Modal) that shows a success animation or a bold "WELCOME BACK!" message.

---

### Task 3: Cleanup & Refinement

**Files:**
- Modify: `mobile-app/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Pass refreshAttendance to Lockout**
Update `TabLayout` to pass the new context function to the `AttendanceLockout` component.

---

### Task 4: Validation

- [ ] **Step 1: Test Restricted Status**
Verify that clicking "Check Status" when still absent shows a loading indicator and then a "No change" message.

- [ ] **Step 2: Test Clearance Transition**
Verify that clearing absence on the admin panel and then clicking "Check Status" shows the "Welcome Back" screen before returning to the dashboard.
