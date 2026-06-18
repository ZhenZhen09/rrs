# 2024-05-30-Single-Approval-Interceptor-Design

**Goal:** Intercept single-task approvals in the Dispatch Console to allow Admins to manually sequence the new task within a rider's existing active route.

**Problem:** Currently, approving a single task directly assigns it without giving the Admin an immediate way to set its priority relative to the rider's existing workload.

**Solution:** When an Admin selects a rider for a pending task, check if that rider has existing active tasks. If so, open the `EnhancedBatchApproveModal` (The Interceptor) with a merged list of the existing tasks and the new task.

## Architecture

### 1. State Additions (`DispatchConsole.tsx`)
- `interceptData`: Stores the context for the single-task intercept.
  - `riderId`: The target rider.
  - `requests`: Merged list of existing active tasks + the new task.
  - `note`: Initial admin remark from the details panel.

### 2. Workflow Logic
- **Trigger**: `onApprove` handler passed to `RequestDetailsPanel`.
- **Condition**: If the rider already has tasks where `isActiveRequest(r)` is true.
- **Merge**: `[...existingActiveTasks, newTask]`.
- **Action**: Show `EnhancedBatchApproveModal`.

### 3. Execution
- **API**: Use `/api/requests/mass-update` with `action: 'approve'` to update all tasks in the sequence.
- **Handling**: The modal allows drag-and-drop reordering, which is then sent as the `sequence` to the backend.

## UI/UX
- Consistent use of the `EnhancedBatchApproveModal` for both batch and single-intercept flows.
- Reuses existing SLA Shield logic for initial sorting suggestions.

## Testing Strategy
- **Manual Test**: Select a pending task, assign it to a rider who already has 2 active tasks. Verify the modal opens with 3 tasks. Reorder and confirm. Verify `queue_order` is updated in the dashboard (via refresh).
- **Edge Case**: Assign to a rider with 0 tasks. Verify direct approval (no modal or modal with 1 item, depending on preference). *Decision: Skip modal if 0 active tasks for speed, unless instructions imply otherwise.* The instructions say "allow placement... in rider's current route sequence", which implies a sequence exists.

## Design Self-Review
- **Ambiguity**: Should "active" tasks include `in_progress`? Yes, they are part of the route.
- **Consistency**: Reusing `handleBatchApprove` logic ensures consistent backend interaction.
