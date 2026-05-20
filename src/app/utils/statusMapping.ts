/**
 * Standardized logic for grouping technical database statuses 
 * into UI-friendly categories for the Dispatch Console and Calendar.
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
  if (['failed', 'cancelled'].includes(s) || 
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
  // Any other status falls into 'pending'
  return 'pending';
};

export const getStatusColor = (group: UIGroupStatus) => {
  switch (group) {
    case 'active': return 'bg-sky-500';
    case 'done': return 'bg-emerald-500';
    case 'failed': return 'bg-rose-500';
    case 'declined': return 'bg-red-600';
    default: return 'bg-amber-500';
  }
};
