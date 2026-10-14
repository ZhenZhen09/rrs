export type DashboardTransitionInput = {
  isAuthenticating: boolean;
  hasUser: boolean;
  loginRouteActive?: boolean;
  tasksLoading: boolean;
  tasksFetching: boolean;
  tasksError: unknown;
};

export type DashboardTransitionState = {
  visible: boolean;
  error: unknown | null;
};

export function getDashboardTransitionState({
  isAuthenticating,
  hasUser,
  loginRouteActive = false,
  tasksLoading,
  tasksFetching,
  tasksError,
}: DashboardTransitionInput): DashboardTransitionState {
  // Keep the blocking transition for auth/route changes and the first task load.
  // Background refetches are non-blocking once cached data is already available.
  if (isAuthenticating || (hasUser && (loginRouteActive || (tasksLoading && !tasksError)))) {
    return { visible: true, error: null };
  }

  if (hasUser && tasksError && !tasksFetching) {
    return { visible: true, error: tasksError };
  }

  return { visible: false, error: null };
}

