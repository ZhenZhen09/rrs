import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithSessionRecovery, refreshSession } from '../authSession';

describe('refreshSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces overlapping refresh requests into one network request', async () => {
    let resolveRequest!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>(resolve => { resolveRequest = resolve; }));

    const first = refreshSession(fetcher);
    const second = refreshSession(fetcher);
    resolveRequest(new Response(JSON.stringify({ id: 'rider-1' }), { status: 200 }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'valid', user: { id: 'rider-1' } },
      { status: 'valid', user: { id: 'rider-1' } },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('preserves the session on a temporary server failure', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(refreshSession(fetcher)).resolves.toEqual({ status: 'unavailable' });
  });

  it('retries a temporary refresh failure once before declaring the session unavailable', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'rider-1' }), { status: 200 }));

    await expect(refreshSession(fetcher)).resolves.toEqual({ status: 'valid', user: { id: 'rider-1' } });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports confirmed invalid refresh credentials as expired', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));

    await expect(refreshSession(fetcher)).resolves.toEqual({ status: 'expired' });
  });

  it('refreshes and retries a protected request after an access-token 401', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'rider-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const onExpired = vi.fn();

    const response = await fetchWithSessionRecovery('/api/private', {}, onExpired, fetcher);

    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('logs out only when the refresh credential is confirmed expired', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    const onExpired = vi.fn();

    const response = await fetchWithSessionRecovery('/api/private', {}, onExpired, fetcher);

    expect(response).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});
