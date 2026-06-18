# Mission Anchor UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify `RequestList.tsx` to visually separate and pin "In Route" tasks at the top when the "Active" filter is selected.

**Architecture:** Use `useMemo` to partition `displayRequests` into `missionTasks` and `remainingActive`. Inject a dedicated UI section "Mission Anchor" in the JSX when the Active filter is active.

**Tech Stack:** React, Tailwind CSS, Framer Motion, Lucide React.

---

### Task 1: Research and Prepare RequestList.tsx

**Files:**
- Modify: `src/app/components/Admin/Dispatch/RequestList.tsx`

- [ ] **Step 1: Locate and identify displayRequests and render logic.**
- [ ] **Step 2: Define missionTasks and remainingActive using useMemo.**

```tsx
  const { missionTasks, remainingActive } = useMemo(() => {
    if (filter !== 'active') return { missionTasks: [], remainingActive: displayRequests };
    
    return {
      missionTasks: displayRequests.filter(r => r.delivery_status === 'in_progress'),
      remainingActive: displayRequests.filter(r => r.delivery_status !== 'in_progress')
    };
  }, [displayRequests, filter]);
```

### Task 2: Implement Mission Anchor UI

**Files:**
- Modify: `src/app/components/Admin/Dispatch/RequestList.tsx`

- [ ] **Step 1: Inject the Mission Anchor container above the main request list.**
- [ ] **Step 2: Update the main list to render `remainingActive` instead of `displayRequests` when the filter is 'active'.**

```tsx
{/* ... inside the ScrollArea ... */}
{filter === 'active' && missionTasks.length > 0 && (
  <div className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm border-dashed">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Mission Anchor (Live)</span>
    </div>
    <div className="space-y-2">
      {missionTasks.map(req => (
        <RequestCard 
          key={req.request_id} 
          request={req} 
          isSelected={selectedId === req.request_id} 
          onClick={() => onSelect(req.request_id)}
          isMultiSelected={selectedIds.includes(req.request_id)}
          onToggleSelection={onToggleSelect}
          isActiveTab={true}
        />
      ))}
    </div>
  </div>
)}

{/* Update the loop for remaining requests */}
{(filter === 'active' ? remainingActive : displayRequests).map(req => (
  // ... existing motion.div and RequestCard ...
))}
```

### Task 3: Handle Grouped View Compatibility

**Files:**
- Modify: `src/app/components/Admin/Dispatch/RequestList.tsx`

- [ ] **Step 1: Ensure groupedRequests (Weekly Pulse) still works correctly.**
- [ ] **Step 2: If grouped view is active, decide if Mission Anchor should still appear at the top.** (Following instructions, it should separate from the list, so it will appear above the groups if active).

### Task 4: Verification

- [ ] **Step 1: Check Active tab with in_progress requests.**
- [ ] **Step 2: Check Active tab with non in_progress requests.**
- [ ] **Step 3: Verify selection and click functionality in Mission Anchor.**
- [ ] **Step 4: Verify grouped view (Day of Week sort) handles the split gracefully.**
