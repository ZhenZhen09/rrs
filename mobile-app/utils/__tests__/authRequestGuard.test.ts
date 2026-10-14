import { getBearerToken, isCurrentAuthenticatedRequest } from '../authRequestGuard';

describe('isCurrentAuthenticatedRequest', () => {
  it('rejects unauthenticated requests before refreshing a session', () => {
    expect(isCurrentAuthenticatedRequest(null, null)).toBe(false);
    expect(isCurrentAuthenticatedRequest('expired-token', null)).toBe(false);
  });

  it('ignores a 401 from a request made with a replaced session token', () => {
    expect(isCurrentAuthenticatedRequest('previous-token', 'current-token')).toBe(false);
  });

  it('allows refresh handling only while the request token is still the current token', () => {
    expect(isCurrentAuthenticatedRequest('current-token', 'current-token')).toBe(true);
  });

  it('reads the bearer token from axios header objects and plain records', () => {
    expect(getBearerToken({ Authorization: 'Bearer current-token' })).toBe('current-token');
    expect(getBearerToken({ get: () => 'Bearer current-token' })).toBe('current-token');
    expect(getBearerToken({ Authorization: 'Basic current-token' })).toBeNull();
  });
});
