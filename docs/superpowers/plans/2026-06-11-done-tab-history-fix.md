# Done Tab Historical View Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove "Day of Week" grouping from the Done tab so it displays as a flat, chronological historical list.

**Architecture:** Update the tab-switching logic in `DispatchConsole.tsx` to default to `newest` sorting when entering the "Done" tab, and modify `RequestList.tsx` to completely bypass grouping logic when viewing completed tasks.

**Tech Stack:** React (Vite), TypeScript.

---

### Task 1: Default Done Tab to Chronological Sort

**Files:**
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`

- [ ] **Step 1: Update `handleFilterChange`**
Change the auto-switch logic so the `completed` (Done) tab automatically switches to a `newest` sort, while leaving `pending` on `day-of-week`.

```tsx
// src/app/pages/Admin/DispatchConsole.tsx

const handleFilterChange = (newTab: "pending" | "active" | "completed") => {
  setFilterTab(newTab);
  
  // AUTO-SWITCH logic based on tab purpose
  if (newTab === 'active') {
    setSortBy('sequence'); // Active uses custom route sequence
  } else if (newTab === 'completed') {
    setSortBy('newest'); // Done tab is historical, sort newest first
  } else {
    setSortBy('day-of-week'); // Pending tab is for scheduling, group by day
  }
  
  setSelectedRequestIds([]);
};
```

---

### Task 2: Disable Grouping UI for Done Tab

**Files:**
- Modify: `src/app/components/Admin/Dispatch/RequestList.tsx`

- [ ] **Step 1: Bypass grouping logic for completed tasks**
Update the `groupedRequests` useMemo hook to return `null` if the user is viewing the completed tab. This ensures the component falls back to the flat `<AnimatePresence>` list.

```tsx
// src/app/components/Admin/Dispatch/RequestList.tsx

  // LAYER 4: Grouping logic for Weekly Pulse + Overdue Guard
  const groupedRequests = useMemo(() => {
    const listToGroup = filter === 'active' ? remainingActive : displayRequests;
    if (sortBy !== 'day-of-week') return null;

    // BUSINESS RULE: Active tab should NOT be grouped by day to preserve the 1-2-3 sequence
    if (filter === 'active') return null;
    
    // BUSINESS RULE: Done tab is historical data and should be a flat list, not grouped
    if (filter === 'completed') return null;

    const groups: Record<string, DeliveryRequest[]> = {};
    if (filter !== 'completed') {
      groups['OVERDUE'] = [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    listToGroup.forEach(req => {
// ... rest of the grouping code ...
```
