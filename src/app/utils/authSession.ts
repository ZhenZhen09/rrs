export type RefreshResult =
  | { status: 'valid'; user: unknown }
  | { status: 'expired' }
  | { status: 'unavailable' };

let refreshInFlight: Promise<RefreshResult> | null = null;

const requestRefresh = async (fetcher: typeof fetch): Promise<RefreshResult> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        return { status: 'valid', user: await response.json() };
      }
      if (response.status === 401 || response.status === 403) {
        return { status: 'expired' };
      }
    } catch {
      // Retry one time for network failures before preserving the local session.
    }

    if (attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  return { status: 'unavailable' };
};

export function refreshSession(fetcher: typeof fetch = fetch): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh(fetcher).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function fetchWithSessionRecovery(
  input: RequestInfo | URL,
  init: RequestInit,
  onExpired: () => void | Promise<void>,
  fetcher: typeof fetch = fetch,
): Promise<Response | null> {
  const request = () => fetcher(input, { ...init, credentials: 'include' });
  const response = await request();
  if (response.status !== 401) return response;

  const refresh = await refreshSession(fetcher);
  if (refresh.status === 'expired') {
    await onExpired();
    return null;
  }
  if (refresh.status === 'unavailable') return response;

  const retriedResponse = await request();
  if (retriedResponse.status === 401) {
    await onExpired();
    return null;
  }
  return retriedResponse;
}
