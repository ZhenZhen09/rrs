import { getAccountingBucket } from './requestAccounting';

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
  const bucket = getAccountingBucket({ status, delivery_status: deliveryStatus });
  if (bucket === 'completed') return 'done';
  if (bucket === 'cancelled') return 'failed';
  if (bucket === 'pending' && String(status).trim().toLowerCase() === 'submitted_waiting') return 'queuing';
  // Legacy views use pending as their fallback; the reporting ledger explicitly shows Unclassified.
  return bucket === 'other' ? 'pending' : bucket;
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
  const group = getGroupedStatus(request.status, request.delivery_status);
  // The API keeps newly submitted requests in a short queue before promoting
  // them to `pending`. Admins can already review or return these requests.
  return group === 'pending' || group === 'queuing';
};
