import type { RiderStatusAction } from '@/services/syncQueue';

export type JobSyncStatus = 'synced' | 'pending' | 'verifying' | 'sync_pending' | 'sync_error';

export function getRiderStatusSyncState(actions: RiderStatusAction[]): JobSyncStatus | null {
  if (actions.length === 0) return null;
  if (actions.some((action) => action.state === 'needs_attention')) return 'sync_error';
  if (actions.some((action) => action.state === 'pending' || action.state === 'syncing')) return 'sync_pending';
  if (actions.every((action) => action.state === 'acked')) return 'synced';
  return null;
}
