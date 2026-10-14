jest.mock('@/utils/AuthManager', () => ({
  AuthManager: {
    getAccessToken: jest.fn(),
    getValidToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    clearSession: jest.fn(),
  },
  getLastRefreshFailure: jest.fn(),
}));

import { api, resetAuthStatus, setAuthFailureListener } from '../api';

const mockAuthManager = jest.requireMock('@/utils/AuthManager').AuthManager;

describe('API auth failure interceptor', () => {
  let onAuthFailure: jest.Mock;
  let rejectUnauthorized: (error: any) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStatus();
    onAuthFailure = jest.fn();
    setAuthFailureListener(onAuthFailure);
    const handlers = (api.interceptors.response as any).handlers;
    rejectUnauthorized = handlers[handlers.length - 1].rejected;
  });

  it('ignores a 401 when logout has already cleared the request session', async () => {
    mockAuthManager.getAccessToken.mockResolvedValue(null);
    const error = {
      config: { url: '/api/users/location/batch', method: 'post', headers: {} },
      response: { status: 401, data: { error: 'Access denied' } },
    };

    await expect(rejectUnauthorized(error)).rejects.toBe(error);

    expect(mockAuthManager.refreshAccessToken).not.toHaveBeenCalled();
    expect(mockAuthManager.clearSession).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('does not invalidate a new login because an older token received a late 401', async () => {
    mockAuthManager.getAccessToken.mockResolvedValue('new-session-token');
    const error = {
      config: {
        url: '/api/users/location/batch',
        method: 'post',
        headers: { Authorization: 'Bearer old-session-token' },
      },
      response: { status: 401, data: { error: 'Access denied' } },
    };

    await expect(rejectUnauthorized(error)).rejects.toBe(error);

    expect(mockAuthManager.refreshAccessToken).not.toHaveBeenCalled();
    expect(mockAuthManager.clearSession).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
