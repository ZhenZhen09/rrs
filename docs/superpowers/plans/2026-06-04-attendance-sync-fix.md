# Attendance Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure mobile app reflects accurate Admin-set attendance status (Absent/Leave) on reload and in real-time.

**Architecture:** Single Source of Truth (SSoT) Sync
**Approach:** Move from local-only attendance state to Server-First sync.
1.  **Server:** Expose endpoint for current status + emit Socket events on change.
2.  **Mobile:** Fetch status on boot/refresh + persist specific status type (not just date) to cache.
3.  **Reactivity:** App reacts to Admin changes via Socket without manual reload.

**Tech Stack:** Node.js/Express, React Native (Expo), Socket.io, AsyncStorage.

---

### Task 1: Server-Side Status Exposure & Events

**Files:**
- Modify: `server/routes/users.ts`

- [ ] **Step 1: Add current status endpoint**
Add `GET /me/attendance` to allow riders to fetch their own status for "today".
```typescript
router.get('/me/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  const [rows]: any = await pool.query(
    'SELECT status, reason FROM attendance_logs WHERE rider_id = ? AND date = CURDATE() LIMIT 1',
    [req.user!.id]
  );
  res.json(rows[0] || { status: null });
});
```

- [ ] **Step 2: Emit socket events on status change**
In `POST /:id/attendance` and `DELETE /attendance/:riderId`, emit `attendance-updated` to the specific rider.
```typescript
// Inside POST /:id/attendance
io.to(id).emit('attendance-updated', { status });

// Inside DELETE /attendance/:riderId
io.to(riderId).emit('attendance-updated', { status: null });
```

- [ ] **Step 3: Verify server changes**
Restart server and check endpoint manually or via curl.

---

### Task 2: Mobile Service & Storage Update

**Files:**
- Modify: `mobile-app/services/apiService.ts`
- Modify: `mobile-app/context/LocationContext.tsx`

- [ ] **Step 1: Add API fetcher**
In `apiService.ts`:
```typescript
export const getMyAttendance = async () => {
  const res = await api.get('/api/users/me/attendance');
  return res.data; // { status: 'absent' | 'present' | 'on_leave' | null }
};
```

- [ ] **Step 2: Update AsyncStorage constants**
In `LocationContext.tsx`:
`const STORAGE_ATTENDANCE_STATUS = '@attendance_status';`

---

### Task 3: LocationContext Sync Logic Fix

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx`

- [ ] **Step 1: Fix initialization bug**
Remove hardcoded `setAttendanceStatus('present')`. Replace with server fetch + cache update.
```typescript
// Inside useEffect (boot)
const syncStatus = async () => {
  try {
    const serverData = await getMyAttendance();
    if (serverData.status) {
      setAttendanceStatus(serverData.status);
      await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, serverData.status);
    } else {
      setAttendanceStatus(null);
      await AsyncStorage.removeItem(STORAGE_ATTENDANCE_STATUS);
    }
  } catch (err) {
    // Fallback to local storage if offline
    const local = await AsyncStorage.getItem(STORAGE_ATTENDANCE_STATUS);
    if (local) setAttendanceStatus(local as any);
  }
};
```

- [ ] **Step 2: Listen for real-time updates**
In `LocationContext` socket `useEffect`:
```typescript
socket.on('attendance-updated', (data) => {
  setAttendanceStatus(data.status);
  if (data.status === 'present') {
    setIsOnDuty(true);
    AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'true');
  }
  queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
});
```

---

### Task 4: Validation

- [ ] **Step 1: Verify Absent Lock**
1. Mark rider "Absent" in Admin Web.
2. Restart Mobile App.
3. **Expected:** App shows "Take it easy today!" screen immediately.

- [ ] **Step 2: Verify Real-time Clear**
1. Stay on "Absent" screen in Mobile App.
2. Click "Clear Absence" in Admin Web.
3. **Expected:** Mobile app automatically switches to Dashboard/Off-Duty view via Socket.

---

## Global Attendance Lockout Extension

**Goal:** Prevent riders from accessing any tabs (Today, Overdue, Tomorrow, History) when marked Absent or On Leave.

### Task 5: Create Reusable Lockout Component

**Files:**
- Create: `mobile-app/components/AttendanceLockout.tsx`

- [ ] **Step 1: Extract UI from TodayScreen**
Move the `attendanceStatus === 'absent' || attendanceStatus === 'on_leave'` return block into this new component.

### Task 6: Implement Layout Guard

**Files:**
- Modify: `mobile-app/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add Guard to TabLayout**
Import `useLocation` and `AttendanceLockout`. If status is restricted, return the lockout component instead of the `<Tabs />` component.

### Task 7: Cleanup TodayScreen

**Files:**
- Modify: `mobile-app/app/(tabs)/index.tsx`

- [ ] **Step 1: Remove redundant code**
Delete the `if (attendanceStatus === 'absent' || ...)` block from `TodayScreen`.
