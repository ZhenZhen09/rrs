import { getRiderStatusSyncState } from '../riderStatusSync';
import type { RiderStatusAction } from '@/services/syncQueue';

const makeAction = (state: RiderStatusAction['state'], operation_id: string): RiderStatusAction => ({
  operation_id,
  rider_id: 'rider-A',
  request_id: 'request-1',
  status: 'completed',
  remark: '',
  timestamp: '2026-10-21T08:00:00Z',
  state,
  last_error: state === 'needs_attention' ? 'Server status changed.' : null,
  created_at: 1,
});

describe('persisted rider action status', () => {
  it('reports pending until every saved action has been acknowledged', () => {
    expect(getRiderStatusSyncState([makeAction('acked', 'op-1'), makeAction('pending', 'op-2')])).toBe('sync_pending');
    expect(getRiderStatusSyncState([makeAction('acked', 'op-1'), makeAction('syncing', 'op-2')])).toBe('sync_pending');
    expect(getRiderStatusSyncState([makeAction('acked', 'op-1'), makeAction('acked', 'op-2')])).toBe('synced');
  });

  it('prioritizes a rejected action for attention and leaves empty state unset', () => {
    expect(getRiderStatusSyncState([makeAction('pending', 'op-1'), makeAction('needs_attention', 'op-2')])).toBe('sync_error');
    expect(getRiderStatusSyncState([])).toBeNull();
  });
});
