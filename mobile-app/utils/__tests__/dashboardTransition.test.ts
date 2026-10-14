import { getDashboardTransitionState } from '../dashboardTransition';

describe('getDashboardTransitionState', () => {
  it('shows the transition while authentication is in progress', () => {
    expect(getDashboardTransitionState({ isAuthenticating: true, hasUser: false, tasksLoading: false, tasksFetching: false, tasksError: null }))
      .toEqual({ visible: true, error: null });
  });

  it('shows the transition while the signed-in rider tasks are loading', () => {
    expect(getDashboardTransitionState({ isAuthenticating: false, hasUser: true, tasksLoading: true, tasksFetching: true, tasksError: null }))
      .toEqual({ visible: true, error: null });
  });

  it('keeps the transition visible after auth finishes until the login route has been replaced', () => {
    expect(getDashboardTransitionState({
      isAuthenticating: false,
      hasUser: true,
      loginRouteActive: true,
      tasksLoading: false,
      tasksFetching: false,
      tasksError: null,
    })).toEqual({ visible: true, error: null });
  });

  it('does not block the dashboard for a background task refresh', () => {
    expect(getDashboardTransitionState({ isAuthenticating: false, hasUser: true, tasksLoading: false, tasksFetching: true, tasksError: null }))
      .toEqual({ visible: false, error: null });
  });

  it('does not replace cached dashboard content with an error during background refresh', () => {
    const error = new Error('Network unavailable');
    expect(getDashboardTransitionState({ isAuthenticating: false, hasUser: true, tasksLoading: false, tasksFetching: true, tasksError: error }))
      .toEqual({ visible: false, error: null });
  });

  it('shows a retryable error when the initial task load fails', () => {
    const error = new Error('Network unavailable');
    expect(getDashboardTransitionState({ isAuthenticating: false, hasUser: true, tasksLoading: true, tasksFetching: false, tasksError: error }))
      .toEqual({ visible: true, error });
  });

  it('does not show the transition after tasks load or for a signed-out rider', () => {
    expect(getDashboardTransitionState({ isAuthenticating: false, hasUser: true, tasksLoading: false, tasksFetching: false, tasksError: null }))
      .toEqual({ visible: false, error: null });
    expect(getDashboardTransitionState({ isAuthenticating: false, hasUser: false, tasksLoading: false, tasksFetching: false, tasksError: null }))
      .toEqual({ visible: false, error: null });
  });
});

