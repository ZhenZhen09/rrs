// Enterprise-Level Mocking (Must be before imports)
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid-123'
}));

import { addToQueue, getRiderStatusActions, processQueue, processRiderStatusActions, queueRiderStatus } from '../syncQueue';
import { getDb } from '../localDb';
import { api } from '@/utils/api';
import { AuthManager } from '@/utils/AuthManager';

jest.mock('../localDb');
jest.mock('@/utils/api');
jest.mock('@/utils/AuthManager', () => ({ AuthManager: { getUserData: jest.fn() } }));

describe('Offline Resilience: Sync Queue Transitions', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      runAsync: jest.fn().mockResolvedValue({}),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn(async (_sql: string, params: any[]) => ({ operation_id: params[0] })),
    };
    (getDb as jest.Mock).mockResolvedValue(mockDb);
    (AuthManager.getUserData as jest.Mock).mockResolvedValue({ id: 'rider-A' });
    jest.clearAllMocks();
  });

  it('stores rider status actions with their owner and without an expiry', async () => {
    const result = await queueRiderStatus({
      riderId: 'rider-A', requestId: 'request-1', status: 'completed', remark: 'Delivered',
      timestamp: '2026-10-21T00:00:00.000Z',
    });

    expect(result.operationId).toEqual(expect.any(String));
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO rider_status_actions'),
      expect.arrayContaining([result.operationId, 'rider-A', 'request-1', 'completed', 'Delivered']),
    );
    expect(mockDb.runAsync.mock.calls[0][0]).not.toContain('expires_at');
  });

  it('keeps rider actions queryable after 48 hours and filters them by owner', async () => {
    const savedAction = {
      operation_id: 'old-op', rider_id: 'rider-A', request_id: 'request-1', status: 'completed',
      remark: '', timestamp: '2026-10-20T08:00:00Z', state: 'pending', created_at: 1_797_000_000_000,
    };
    mockDb.getAllAsync.mockImplementation(async (_sql: string, params: string[]) => params[0] === 'rider-A' ? [savedAction] : []);
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T08:00:00Z'));
    try {
      await expect(getRiderStatusActions('rider-A')).resolves.toEqual([savedAction]);
      await expect(getRiderStatusActions('rider-B')).resolves.toEqual([]);
      expect(mockDb.getAllAsync.mock.calls[0][0]).toContain('WHERE rider_id=?');
      expect(mockDb.getAllAsync.mock.calls[0][0]).not.toContain('expires_at');
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries durable actions using their stored IDs and blocks later updates for a conflicted delivery', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { operation_id: 'op-1', rider_id: 'rider-A', request_id: 'request-1', status: 'in_progress', remark: '', timestamp: '2026-10-21T08:00:00Z', state: 'pending' },
      { operation_id: 'op-2', rider_id: 'rider-A', request_id: 'request-1', status: 'completed', remark: '', timestamp: '2026-10-21T09:00:00Z', state: 'pending' },
      { operation_id: 'op-3', rider_id: 'rider-A', request_id: 'request-2', status: 'in_progress', remark: '', timestamp: '2026-10-21T09:00:00Z', state: 'pending' },
    ]);
    const conflict: any = new Error('Conflict');
    conflict.response = { status: 409, data: { error: 'Operation payload changed' } };
    (api.put as jest.Mock).mockRejectedValueOnce(conflict).mockResolvedValueOnce({ status: 200 });

    await processRiderStatusActions('rider-A');

    expect(api.put).toHaveBeenCalledTimes(2);
    expect(api.put).toHaveBeenNthCalledWith(1, '/api/requests/request-1/status', expect.any(Object), {
      headers: { 'Idempotency-Key': 'op-1' },
    });
    expect(api.put).toHaveBeenNthCalledWith(2, '/api/requests/request-2/status', expect.any(Object), {
      headers: { 'Idempotency-Key': 'op-3' },
    });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE rider_status_actions SET state=?'),
      ['needs_attention', 'Operation payload changed', expect.any(Number), 'op-1'],
    );
  });

  it('does not upload actions belonging to a different signed-in rider', async () => {
    (AuthManager.getUserData as jest.Mock).mockResolvedValue({ id: 'rider-B' });
    await processRiderStatusActions('rider-A');
    expect(mockDb.getAllAsync).not.toHaveBeenCalledWith(expect.stringContaining('FROM rider_status_actions'), expect.anything());
    expect(api.put).not.toHaveBeenCalled();
  });

  it('does not send later actions for a delivery already marked needs_attention', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { operation_id: 'op-rejected', rider_id: 'rider-A', request_id: 'request-1', state: 'needs_attention' },
      { operation_id: 'op-later', rider_id: 'rider-A', request_id: 'request-1', state: 'pending' },
      { operation_id: 'op-other', rider_id: 'rider-A', request_id: 'request-2', state: 'pending' },
    ]);
    (api.put as jest.Mock).mockResolvedValue({ status: 200 });

    await processRiderStatusActions('rider-A');

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/api/requests/request-2/status', expect.any(Object), {
      headers: { 'Idempotency-Key': 'op-other' },
    });
  });

  it('✅ PASS: Successfully adds item to outbox with 24h expiry', async () => {
    await addToQueue({
      endpoint: '/test',
      method: 'POST',
      payload: { data: 1 }
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_queue'),
      expect.arrayContaining(['/test', 'POST', '{"data":1}', expect.any(String)])
    );
  });

  it('✅ PASS: Increments retry_count on transient server failure (500)', async () => {
    const mockItem = { id: 1, endpoint: '/api', method: 'PUT', payload: '{}', idempotency_key: 'key' };
    mockDb.getAllAsync.mockResolvedValue([mockItem]);
    
    // Simulate server crash
    (api.request as jest.Mock).mockRejectedValue(new Error('Network Error'));

    await processQueue();

    // Check that it reverted to 'pending' to try again later
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1"),
      [1]
    );
  });

  it('🛑 ALERT: Discards task on fatal client error (400)', async () => {
    const mockItem = { id: 2, endpoint: '/api', method: 'PUT', payload: '{}', idempotency_key: 'key' };
    mockDb.getAllAsync.mockResolvedValue([mockItem]);
    
    // Simulate "Bad Request" (User error/Permission issue)
    const error: any = new Error('Bad Request');
    error.response = { status: 400 };
    (api.request as jest.Mock).mockRejectedValue(error);

    await processQueue();

    // Check that it marked as 'failed' instead of retrying
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_queue SET status = 'failed'"),
      expect.anything()
    );
  });
});
