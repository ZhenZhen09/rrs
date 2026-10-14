jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { getHistoryTasks, getTasks, submitAttendance, updateJobStatus } from '../apiService';
import { api } from '@/utils/api';

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
    getFirstAsync: jest.fn(),
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

      const result = await getTasks();
      expect(api.get).toHaveBeenCalledWith('/api/rider/tasks/active');
      expect(result).toEqual(mockData);
    });

    it('should handle nested data structure', async () => {
      const mockData = [{ id: '1', request_id: 'req_1' }];
      (api.get as jest.Mock).mockResolvedValue({ data: { data: mockData } });

      const result = await getTasks();
      expect(result).toEqual(mockData);
    });
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
      (api.put as jest.Mock).mockResolvedValue({ data: { success: true } });

      await updateJobStatus('req_1', 'in_progress', 'Starting');
      expect(api.put).toHaveBeenCalledWith(
        '/api/requests/req_1/status',
        expect.objectContaining({ status: 'in_progress', remark: 'Starting' }),
        expect.objectContaining({ headers: { 'Idempotency-Key': expect.any(String) } }),
      );
    });
  });
});
