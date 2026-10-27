jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { getCachedJob, getCachedJobSnapshot, getHistoryTasks, getJobDetails, getJobQueryKey, getTasks, submitAttendance, updateJobStatus } from '../apiService';
import { api } from '@/utils/api';
import { getDb } from '../localDb';

jest.mock('@/utils/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('../localDb', () => ({
  getDb: jest.fn().mockResolvedValue({
    runAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn(async (sql: string, params: any[]) => sql.includes('rider_status_actions') ? { operation_id: params[0] } : null),
  }),
}));

describe('apiService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch tasks successfully', async () => {
      const mockData = [{ id: '1', request_id: 'req_1' }];
      (api.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await getTasks('rider-1');
      expect(api.get).toHaveBeenCalledWith('/api/rider/tasks/active');
      expect(result).toEqual(mockData);
    });

    it('stores active task cache under the authenticated rider key', async () => {
      const mockData = [{ id: '1', request_id: 'req_1' }];
      (api.get as jest.Mock).mockResolvedValue({ data: mockData });

      await getTasks('rider-A');

      const database = await (getDb as jest.Mock).mock.results[0].value;
      expect(database.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO tasks_cache'),
        ['active_tasks:rider-A', JSON.stringify(mockData), expect.any(Number)],
      );
    });

    it('should handle nested data structure', async () => {
      const mockData = [{ id: '1', request_id: 'req_1' }];
      (api.get as jest.Mock).mockResolvedValue({ data: { data: mockData } });

      const result = await getTasks('rider-1');
      expect(result).toEqual(mockData);
    });
  });

  it('keeps in-memory job details isolated by rider', () => {
    expect(getJobQueryKey('rider-A', 'req_1')).toEqual(['job', 'rider-A', 'req_1']);
    expect(getJobQueryKey('rider-B', 'req_1')).not.toEqual(getJobQueryKey('rider-A', 'req_1'));
  });

  it('does not prevent sending a persisted action when the secondary task-cache write fails', async () => {
    const database = {
      runAsync: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('cache disk failure')),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn(async (sql: string) => sql.includes('rider_status_actions')
        ? { operation_id: 'saved-operation' }
        : { data: JSON.stringify({ request_id: 'req_1' }), updated_at: 123 }),
    };
    (getDb as jest.Mock).mockResolvedValue(database);
    (api.put as jest.Mock).mockResolvedValue({ data: { success: true, deliveryStatus: 'completed' } });

    await expect(updateJobStatus('req_1', 'completed', 'Delivered', 'rider-A'))
      .resolves.toMatchObject({ success: true, queued: false });
    expect(api.put).toHaveBeenCalledTimes(1);
  });

  it('submits present attendance with the stable start operation id', async () => {
    const response = { data: { success: true, session: { id: 'shift-1', start_time: '2026-10-09 08:00:00' }, is_on_duty: true } };
    (api.post as jest.Mock).mockResolvedValue(response);

    await expect(submitAttendance('rider-1', 'present', undefined, 'start-op-1')).resolves.toBe(response);
    expect(api.post).toHaveBeenCalledWith('/api/users/rider-1/attendance', {
      status: 'present',
      reason: undefined,
      operation_id: 'start-op-1',
    });
  });

  it('rejects a present response that does not confirm a persisted shift session', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true, is_on_duty: true } });

    await expect(submitAttendance('rider-1', 'present', undefined, 'start-op-1'))
      .rejects.toThrow('The server did not confirm your shift start. Please try again.');
  });

  describe('getHistoryTasks', () => {
    it('should fetch paginated rider history', async () => {
      const mockData = [{ id: '1', request_id: 'req_1' }];
      (api.get as jest.Mock).mockResolvedValue({ data: { data: mockData } });

      const result = await getHistoryTasks();
      expect(api.get).toHaveBeenCalledWith('/api/rider/tasks/history', { params: { page: 1, limit: 50 } });
      expect(result).toEqual(mockData);
    });
  });

  describe('updateJobStatus', () => {
    it('should send status update request', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: { success: true, deliveryStatus: 'in_progress' } });

      const result = await updateJobStatus('req_1', 'in_progress', 'Starting', 'rider-1');
      expect(api.put).toHaveBeenCalledWith(
        '/api/requests/req_1/status',
        expect.objectContaining({ status: 'in_progress', remark: 'Starting' }),
        expect.objectContaining({ headers: { 'Idempotency-Key': expect.any(String) } }),
      );
      expect(result).toMatchObject({ success: true, queued: false, deliveryStatus: 'in_progress' });
      expect((getDb as jest.Mock).mock.results[0].value).toBeDefined();
    });

    it('persists rider identity and returns pending sync only after the local write succeeds', async () => {
      (api.put as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(updateJobStatus('req_1', 'completed', 'Delivered', 'rider-A'))
        .resolves.toMatchObject({ success: true, queued: true, operationId: expect.any(String) });
      const database = await (getDb as jest.Mock).mock.results[0].value;
      expect(database.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO rider_status_actions'),
        expect.arrayContaining(['rider-A', 'req_1', 'completed', 'Delivered']),
      );
    });

    it('queues a new update behind an earlier unacknowledged action for the same delivery', async () => {
      const database = {
        runAsync: jest.fn().mockResolvedValue({}),
        getFirstAsync: jest.fn(async (sql: string, params: any[]) => sql.includes('rider_status_actions')
          ? { operation_id: params[0] }
          : null),
        getAllAsync: jest.fn(async (_sql: string, params: any[]) => [
          { operation_id: 'previous-op', rider_id: params[0], request_id: 'req_1', status: 'in_progress', state: 'pending', created_at: 1 },
          { operation_id: 'new-op', rider_id: params[0], request_id: 'req_1', status: 'completed', state: 'pending', created_at: 2 },
        ]),
      };
      (getDb as jest.Mock).mockResolvedValue(database);

      await expect(updateJobStatus('req_1', 'completed', 'Delivered', 'rider-A'))
        .resolves.toMatchObject({ success: true, queued: true });
      expect(api.put).not.toHaveBeenCalled();
    });

    it('loads saved job details only from the matching rider cache when offline', async () => {
      const database = { runAsync: jest.fn(), getAllAsync: jest.fn().mockResolvedValue([]), getFirstAsync: jest.fn(async (_sql: string, params: any[]) =>
        params[0] === 'job:rider-A:req_1' ? { data: JSON.stringify({ request_id: 'req_1', recipient_name: 'Rider A' }) } : null) };
      (getDb as jest.Mock).mockResolvedValue(database);
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(getJobDetails('req_1', 'rider-A')).resolves.toMatchObject({ recipient_name: 'Rider A' });
      await expect(getCachedJob('rider-B', 'req_1')).resolves.toBeNull();
    });

    it('explains when delivery details were not saved before the outage', async () => {
      const database = { getFirstAsync: jest.fn().mockResolvedValue(null) };
      (getDb as jest.Mock).mockResolvedValue(database);
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(getJobDetails('req_missing', 'rider-A'))
        .rejects.toThrow('No saved delivery details are available offline.');
    });

    it('returns the saved timestamp with offline delivery details', async () => {
      const database = { getFirstAsync: jest.fn(async () => ({ data: JSON.stringify({ request_id: 'req_1' }), updated_at: 1_798_000_000_000 })) };
      (getDb as jest.Mock).mockResolvedValue(database);
      await expect(getCachedJobSnapshot('rider-A', 'req_1')).resolves.toMatchObject({
        job: { request_id: 'req_1' }, savedAt: 1_798_000_000_000,
      });
    });
  });
});
