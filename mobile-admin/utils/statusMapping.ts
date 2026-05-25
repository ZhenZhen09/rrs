/**
 * Standardized logic for grouping technical database statuses 
 * into UI-friendly categories for the Dispatch Console and Calendar.
 * (Mirrored from Web Admin for consistency)
 */

export type UIGroupStatus = 'pending' | 'active' | 'done' | 'failed' | 'declined';

export const getGroupedStatus = (
  status: string = "", 
  deliveryStatus: string = ""
): UIGroupStatus => {
  const s = String(status || "").toLowerCase().trim();
  const ds = String(deliveryStatus || "").toLowerCase().trim();

  // 1. Terminal Negative - Declined/Rejected
  if (['disapproved', 'declined', 'rejected'].includes(s) || 
      ['disapproved'].includes(ds)) {
    return 'declined';
  }

  // 2. Terminal Negative - Failed/Cancelled
  if (['failed', 'cancelled', 'returned_for_revision'].includes(s) || 
      ['failed', 'cancelled'].includes(ds)) {
    return 'failed';
  }

  // 3. Terminal Success
  if (['completed', 'delivered'].includes(ds)) {
    return 'done';
  }

  // 4. Active Operations (Approved but not terminal)
  if (s === 'approved' || ['assigned', 'in_progress', 'arrived'].includes(ds)) {
    return 'active';
  }

  // 5. Awaiting Review (Includes Revisions)
  return 'pending';
};

export const getStatusColor = (group: UIGroupStatus) => {
  switch (group) {
    case 'active': return '#10B981';
    case 'done': return '#94A3B8';
    case 'failed': return '#F43F5E';
    case 'declined': return '#DC2626';
    default: return '#F59E0B';
  }
};
