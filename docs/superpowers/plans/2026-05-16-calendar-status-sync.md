# Calendar Status Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `CalendarView` to align its status logic and colors with the `DispatchConsole`.

**Architecture:**
- Map 7+ technical statuses into 4 UI categories: **PENDING, ACTIVE, DONE, FAILED**.
- Update filtering logic to support these groups.
- Standardize colors: Yellow (Pending), Green (Active), Slate (Done), Red (Failed).

---

### Task 1: Refactor State and Logic

**Files:**
- Modify: `src/app/pages/Admin/CalendarView.tsx`

- [ ] **Step 1:** Update `activeFilters` and `localFilters` initialization.

```typescript
const [activeFilters, setActiveFilters] = useState<CalendarFilters>({
  status: ['pending', 'active', 'done', 'failed'], // Grouped keys
  rider: 'all',
  department: 'all',
  urgency: ['Low', 'Medium', 'High', 'Urgent'],
  dateRange: { start: null, end: null }
});
```

- [ ] **Step 2:** Refactor `filteredRequests` useMemo to handle grouping.

```typescript
// Inside filteredRequests
const rawStatus = req.delivery_status || req.status;
let uiStatus = 'pending';
if (['approved', 'assigned', 'in_progress'].includes(rawStatus)) uiStatus = 'active';
if (rawStatus === 'completed') uiStatus = 'done';
if (['failed', 'disapproved', 'cancelled'].includes(rawStatus)) uiStatus = 'failed';

if (!activeFilters.status.includes(uiStatus)) return false;
```

### Task 2: Update UI Header and Filters

**Files:**
- Modify: `src/app/pages/Admin/CalendarView.tsx`

- [ ] **Step 1:** Update `StatusIndicator` legend in the header (Remove In Transit/Critical, add Done/Failed).
- [ ] **Step 2:** Update the sidebar filter checkbox list to use the 4 categories.

### Task 3: Standardize Row and Badge Visuals

**Files:**
- Modify: `src/app/pages/Admin/CalendarView.tsx`

- [ ] **Step 1:** Update `getStatusColor` in `CalendarTaskRow`.
- [ ] **Step 2:** Update the `Badge` logic in `IndustrialListView` to show grouped labels (ACTIVE, DONE, etc.) and correct colors.

### Task 4: Final Verification

- [ ] **Step 1:** Verify a 'pending' request is yellow.
- [ ] **Step 2:** Verify an 'assigned' or 'in_progress' request is green ('ACTIVE').
- [ ] **Step 3:** Verify a 'completed' request is neutral ('DONE').
- [ ] **Step 4:** Verify a 'failed' request is red ('FAILED').
