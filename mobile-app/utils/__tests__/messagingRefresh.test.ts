import { canRefreshMessaging, createMessagingRefreshQueue } from '../messagingRefresh';

describe('canRefreshMessaging', () => {
  it('allows the first refresh and blocks rapid duplicate refreshes', () => {
    expect(canRefreshMessaging(0, 1000)).toBe(true);
    expect(canRefreshMessaging(1000, 1500)).toBe(false);
    expect(canRefreshMessaging(1000, 2000)).toBe(true);
  });
});

describe('messaging refresh queue', () => {
  afterEach(() => jest.useRealTimers());

  it('keeps one active request and one trailing refresh for a burst', async () => {
    jest.useFakeTimers();
    let release!: () => void;
    const refresh = jest.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; })).mockResolvedValue(undefined);
    const queue = createMessagingRefreshQueue(refresh, jest.fn());
    const first = queue.request();
    for (let i = 0; i < 20; i += 1) void queue.request();
    expect(refresh).toHaveBeenCalledTimes(1);
    release();
    await first;
    await jest.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    queue.dispose();
  });

  it('discards queued work after HTTP 429 instead of retrying', async () => {
    jest.useFakeTimers();
    let reject!: (error: unknown) => void;
    const refresh = jest.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
    const onError = jest.fn();
    const queue = createMessagingRefreshQueue(refresh, onError);
    const first = queue.request();
    void queue.request();
    const error = { response: { status: 429, headers: { 'retry-after': '900' } } };
    reject(error);
    await first;
    await jest.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    queue.dispose();
  });

  it('cancels a trailing refresh on disposal', async () => {
    jest.useFakeTimers();
    const refresh = jest.fn().mockResolvedValue(undefined);
    const queue = createMessagingRefreshQueue(refresh, jest.fn());
    await queue.request();
    void queue.request();
    queue.dispose();
    await jest.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
