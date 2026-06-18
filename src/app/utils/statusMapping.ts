/**
 * Enterprise Status Mapping Utility
 * Provides a single source of truth for request status classification across the Admin portal.
 */

export const TERMINAL_STATUSES = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];

export type UIGroupStatus = 'pending' | 'active' | 'done' | 'failed' | 'declined' | 'queuing' | 'revision';

/**
 * Standardized logic for grouping technical database statuses 
 * into UI-friendly categories for the Dispatch Console and Calendar.
 */
export const getGroupedStatus = (
  status: string = "", 
  deliveryStatus: string = ""
): UIGroupStatus => {
  const s = String(status || "").toLowerCase().trim();
  const ds = String(deliveryStatus || "").toLowerCase().trim();

  // 0. Queuing Phase (Personnel 60s window)
  if (s === 'submitted_waiting') {
    return 'queuing';
  }

  // 1. Terminal Negative - Declined/Rejected
  if (['disapproved', 'declined', 'rejected'].includes(s) || 
      ['disapproved'].includes(ds)) {
    return 'declined';
  }

  // 2. Terminal Negative - Failed/Cancelled
  if (['failed', 'cancelled'].includes(s) || 
      ['failed', 'cancelled'].includes(ds)) {
    return 'failed';
  }

  // 3. Terminal Success
  if (['completed', 'delivered'].includes(ds)) {
    return 'done';
  }

  // 4. Active Operations (Approved but not terminal)
  // RESUBMISSION SPECIAL: pending requests marked as pending_review go here!
  if (s === 'approved' || ['assigned', 'in_progress', 'arrived', 'pending_review'].includes(ds)) {
    return 'active';
  }

  // 5. In Revision (Hidden from Admin)
  if (s === 'returned_for_revision') {
    return 'revision';
  }

  // 6. Awaiting Review (Standard Pending)
  if (s === 'pending') {
    return 'pending';
  }

  return 'pending';
};

/**
 * Returns the brand color for a given status group.
 */
export const getStatusColor = (group: UIGroupStatus) => {
  switch (group) {
    case 'active': return '#10B981'; // Emerald
    case 'done': return '#94A3B8';   // Slate
    case 'failed': return '#F43F5E'; // Rose
    case 'declined': return '#DC2626'; // Red
    default: return '#F59E0B';       // Amber
  }
};

/**
 * Checks if a request is in a "Finished" state (Done tab).
 */
export const isTerminalRequest = (request: { status: string; delivery_status?: string }) => {
  const group = getGroupedStatus(request.status, request.delivery_status);
  return ['done', 'failed', 'declined'].includes(group);
};

/**
 * Checks if a request is in an "Active" state (Active tab).
 */
export const isActiveRequest = (request: { status: string; delivery_status?: string }) => {
  return getGroupedStatus(request.status, request.delivery_status) === 'active';
};

/**
 * Checks if a request is in a "Pending" state (Pending tab).
 */
export const isPendingRequest = (request: { status: string; delivery_status?: string }) => {
  return getGroupedStatus(request.status, request.delivery_status) === 'pending';
};
