# Single Approval Interceptor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Option A" workflow in `DispatchConsole.tsx` to intercept single-task approvals and show the Sequencer Modal.

**Architecture:**
- Use React state to track "intercept" mode.
- Filter `active` requests for a rider during the `onApprove` trigger.
- Reuse `EnhancedBatchApproveModal` for the UI.

**Tech Stack:** React, Lucide-React, Framer Motion (via modal).

---

### Task 1: Update State and Handlers in DispatchConsole.tsx

**Files:**
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`

- [ ] **Step 1: Add intercept state**
Add `interceptData` state and `showInterceptModal` logic.

```tsx
  // Intercept State
  const [interceptData, setInterceptData] = useState<{
    riderId: string;
    requests: DeliveryRequest[];
    note: string;
  } | null>(null);
```

- [ ] **Step 2: Define `handleInterceptConfirm`**
Create a handler that uses the existing `handleBatchApprove` logic but handles the `interceptData` cleanup.

```tsx
  const handleInterceptConfirm = async (riderId: string, sequence: string[], note: string) => {
    // We need to set selectedRequestIds to the intercept sequence temporarily 
    // so handleBatchApprove uses the correct IDs
    setSelectedRequestIds(sequence);
    await handleBatchApprove(riderId, sequence, note);
    setInterceptData(null);
  };
```

- [ ] **Step 3: Refactor `onApprove` handler**
Update the `onApprove` passed to `RequestDetailsPanel`.

```tsx
                    onApprove={async (riderId, remark) => {
                      if (!selectedRequest) return;
                      
                      // Find existing active tasks for this rider
                      const activeTasks = (requests || []).filter(r => 
                        r.assigned_rider_id === riderId && 
                        isActiveRequest(r) &&
                        r.request_id !== selectedRequest.request_id
                      );

                      if (activeTasks.length > 0) {
                        setInterceptData({
                          riderId,
                          requests: [...activeTasks, selectedRequest],
                          note: remark
                        });
                      } else {
                        // Direct approval if no active tasks
                        setIsSubmitting(true);
                        try {
                          await approveRequest(selectedRequest.request_id, riderId, remark);
                          toast.success("Request approved and assigned");
                          refreshData();
                        } catch (err) {
                          toast.error("Failed to approve request");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }
                    }}
```

### Task 2: Integrate Modal in DispatchConsole.tsx

**Files:**
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`

- [ ] **Step 1: Add the Modal component**
Place the `EnhancedBatchApproveModal` for the intercept flow.

```tsx
      {/* Single Approval Interceptor Modal */}
      <EnhancedBatchApproveModal
        isOpen={!!interceptData}
        onClose={() => setInterceptData(null)}
        selectedRequests={interceptData?.requests || []}
        riders={reactiveRiders}
        onConfirm={handleInterceptConfirm}
        isSubmitting={isSubmitting}
      />
```

### Task 3: Verification

- [ ] **Step 1: Manual Verification**
1. Open Dispatch Console.
2. Ensure a rider has at least one active task.
3. Select a pending task.
4. Assign it to that rider.
5. Verify `EnhancedBatchApproveModal` opens with both tasks.
6. Reorder them and confirm.
7. Verify successful assignment and re-sequencing.

- [ ] **Step 2: Check Edge Case**
1. Assign to a rider with 0 tasks.
2. Verify it approves directly without modal.
