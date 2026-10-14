// Shared, browser-safe reporting contract. Each request has ONE primary bucket.
export const ACCOUNTING_BUCKETS = ['pending', 'active', 'revision', 'completed', 'failed', 'cancelled', 'declined', 'other'] as const;
export type AccountingBucket = typeof ACCOUNTING_BUCKETS[number];
export const ACCOUNTING_LABELS: Record<AccountingBucket, string> = {
  pending: 'Pending / queued', active: 'Active', revision: 'For revision', completed: 'Completed',
  failed: 'Failed', cancelled: 'Cancelled', declined: 'Declined', other: 'Unclassified',
};
export interface AccountingRequest {
  status?: string | null;
  delivery_status?: string | null;
  is_overdue?: boolean;
}
const normalize = (value: unknown) => String(value || '').trim().toLowerCase();
export function getAccountingBucket(request: AccountingRequest): AccountingBucket {
  const s = normalize(request.status), ds = normalize(request.delivery_status);
  // Explicit administrative dispositions take precedence over stale delivery states.
  if (s === 'cancelled') return 'cancelled';
  if (['disapproved', 'declined', 'rejected'].includes(s)) return 'declined';
  if (s === 'failed') return 'failed';
  if (ds === 'cancelled') return 'cancelled';
  if (['disapproved', 'declined', 'rejected'].includes(ds)) return 'declined';
  if (ds === 'failed') return 'failed';
  if (['completed', 'delivered'].includes(ds) || ['completed', 'delivered'].includes(s)) return 'completed';
  if (s === 'returned_for_revision') return 'revision';
  if (s === 'approved' || ['assigned', 'in_progress', 'in_transit', 'picked_up', 'arrived', 'pending_review'].includes(ds)) return 'active';
  if (['pending', 'submitted_waiting'].includes(s)) return 'pending';
  return 'other';
}
export function buildRequestAccounting(requests: readonly AccountingRequest[]) {
  const counts: Record<AccountingBucket, number> = { pending: 0, active: 0, revision: 0, completed: 0, failed: 0, cancelled: 0, declined: 0, other: 0 };
  let overdue = 0;
  for (const request of requests) {
    const bucket = getAccountingBucket(request);
    counts[bucket]++;
    if (bucket === 'active' && request.is_overdue) overdue++;
  }
  const accounted = ACCOUNTING_BUCKETS.reduce((sum, bucket) => sum + counts[bucket], 0);
  return { ...counts, total: requests.length, accounted, difference: requests.length - accounted,
    done: counts.completed + counts.failed + counts.cancelled + counts.declined, overdue };
}

// Used by SQL-only historical aggregations; priority matches getAccountingBucket.
export const ACCOUNTING_BUCKET_SQL = `CASE
  WHEN LOWER(TRIM(COALESCE(status, ''))) = 'cancelled' THEN 'cancelled'
  WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('disapproved','declined','rejected') THEN 'declined'
  WHEN LOWER(TRIM(COALESCE(status, ''))) = 'failed' THEN 'failed'
  WHEN LOWER(TRIM(COALESCE(delivery_status, ''))) = 'cancelled' THEN 'cancelled'
  WHEN LOWER(TRIM(COALESCE(delivery_status, ''))) IN ('disapproved','declined','rejected') THEN 'declined'
  WHEN LOWER(TRIM(COALESCE(delivery_status, ''))) = 'failed' THEN 'failed'
  WHEN LOWER(TRIM(COALESCE(delivery_status, ''))) IN ('completed','delivered') OR LOWER(TRIM(COALESCE(status, ''))) IN ('completed','delivered') THEN 'completed'
  WHEN LOWER(TRIM(COALESCE(status, ''))) = 'returned_for_revision' THEN 'revision'
  WHEN LOWER(TRIM(COALESCE(status, ''))) = 'approved' OR LOWER(TRIM(COALESCE(delivery_status, ''))) IN ('assigned','in_progress','in_transit','picked_up','arrived','pending_review') THEN 'active'
  WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('pending','submitted_waiting') THEN 'pending'
  ELSE 'other' END`;
