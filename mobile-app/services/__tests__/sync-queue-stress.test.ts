// Enterprise-Level Mocking (Must be before ANY imports)
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid-123'
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn(),
}));

import { processQueue } from '../syncQueue';
import { getDb } from '../localDb';
import { api } from '@/utils/api';

jest.mock('../localDb');
jest.mock('@/utils/api');

describe('Intensive Audit: High-Pressure Sync Queue', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      runAsync: jest.fn().mockResolvedValue({}),
      getAllAsync: jest.fn().mockResolvedValue([]),
    };
    (getDb as jest.Mock).mockResolvedValue(mockDb);
    jest.clearAllMocks();
  });

  it('✅ PASS: Processes a high-volume batch (50 items) sequentially', async () => {
    // Generate 50 mock items
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      endpoint: `/api/test/${i}`,
      method: 'PUT',
      payload: '{}',
      idempotency_key: `key-${i}`
    }));

    mockDb.getAllAsync.mockResolvedValue(manyItems);
    (api.request as jest.Mock).mockResolvedValue({ status: 200 });

    await processQueue();

    // Verify all 50 items were attempted
    expect(api.request).toHaveBeenCalledTimes(50);
    // Verify each item was deleted after success
    expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sync_queue'),
        expect.anything()
    );
  });

  it('🛑 ALERT: Correctly handles a "Mixed Bag" of success and network flapping', async () => {
    const items = [
      { id: 1, endpoint: '/a', method: 'PUT', payload: '{}', idempotency_key: 'k1' },
      { id: 2, endpoint: '/b', method: 'PUT', payload: '{}', idempotency_key: 'k2' },
      { id: 3, endpoint: '/c', method: 'PUT', payload: '{}', idempotency_key: 'k3' }
    ];

    mockDb.getAllAsync.mockResolvedValue(items);
    
    // 1st success, 2nd fails (Network), 3rd success
    (api.request as jest.Mock)
      .mockResolvedValueOnce({ status: 200 })
      .mockRejectedValueOnce(new Error('Signal Lost'))
      .mockResolvedValueOnce({ status: 200 });

    await processQueue();

    // 1 and 3 should be deleted
    expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [1]);
    expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [3]);
    
    // 2 should be reverted to pending
    expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE sync_queue SET status = 'pending'"),
        [2]
    );
  });
});
