import { getTasks, updateJobStatus } from '../apiService';
import { api } from '@/utils/api';

jest.mock('@/utils/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
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
      expect(api.get).toHaveBeenCalledWith('/api/requests', { params: { limit: 100 } });
      expect(result).toEqual(mockData);
    });

    it('should handle nested data structure', async () => {
      const mockData = [{ id: '1', request_id: 'req_1' }];
      (api.get as jest.Mock).mockResolvedValue({ data: { data: mockData } });

      const result = await getTasks();
      expect(result).toEqual(mockData);
    });
  });

  describe('updateJobStatus', () => {
    it('should send status update request', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: { success: true } });

      await updateJobStatus('req_1', 'in_progress', 'Starting');
      expect(api.put).toHaveBeenCalledWith('/api/requests/req_1/status', expect.objectContaining({
        status: 'in_progress',
        remark: 'Starting',
      }));
    });
  });
});
