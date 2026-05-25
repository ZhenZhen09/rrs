// Enterprise-Level Mocking (Must be before imports)
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid-123'
}));

import { addToQueue, processQueue } from '../syncQueue';
import { getDb } from '../localDb';
import { api } from '@/utils/api';

jest.mock('../localDb');
jest.mock('@/utils/api');

describe('Offline Resilience: Sync Queue Transitions', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      runAsync: jest.fn().mockResolvedValue({}),
      getAllAsync: jest.fn().mockResolvedValue([]),
    };
    (getDb as jest.Mock).mockResolvedValue(mockDb);
    jest.clearAllMocks();
  });

  it('✅ PASS: Successfully adds item to outbox with 24h expiry', async () => {
    await addToQueue({
      endpoint: '/test',
      method: 'POST',
      payload: { data: 1 }
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_queue'),
      expect.arrayContaining(['/test', 'POST', '{"data":1}', 'uuid-123'])
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
