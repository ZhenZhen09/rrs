import { getAuthRedirect } from '@/utils/authNavigation';

describe('getAuthRedirect', () => {
  it('waits for the root navigation container before redirecting', () => {
    expect(getAuthRedirect({ isLoading: false, user: null, firstSegment: undefined, navigationReady: false })).toBeNull();
  });

  it('redirects unauthenticated users outside the login route after navigation is ready', () => {
    expect(getAuthRedirect({ isLoading: false, user: null, firstSegment: '(tabs)', navigationReady: true })).toBe('/login');
  });
});
