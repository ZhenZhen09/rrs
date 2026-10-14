export function canRefreshMessaging(lastRefreshAt: number, now = Date.now(), minimumIntervalMs = 1000): boolean {
  return lastRefreshAt === 0 || now - lastRefreshAt >= minimumIntervalMs;
}

export function createMessagingRefreshQueue(refresh: () => Promise<void>, onError: (error: unknown) => void, minimumIntervalMs = 1000) {
  let active: Promise<void> | null = null;
  let lastStarted: number | null = null;
  let pending = false;
  let pendingForce = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = (options?: { force?: boolean }): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (active) {
      pending = true;
      pendingForce ||= Boolean(options?.force);
      return active;
    }
    const remaining = lastStarted === null ? 0 : Math.max(0, minimumIntervalMs - (Date.now() - lastStarted));
    if (!options?.force && remaining > 0) {
      pending = true;
      timer ??= setTimeout(() => { timer = undefined; if (pending) void request({ force: pendingForce }); }, remaining);
      return Promise.resolve();
    }
    if (timer) clearTimeout(timer);
    timer = undefined;
    pending = false;
    pendingForce = false;
    lastStarted = Date.now();
    let failed = false;
    let operation: Promise<void>;
    try { operation = refresh(); } catch (error) { operation = Promise.reject(error); }
    active = operation.catch(error => {
      failed = true;
      pending = false;
      pendingForce = false;
      if (!disposed) onError(error);
    }).finally(() => {
      active = null;
      if (!disposed && pending && !failed) void request({ force: pendingForce });
    });
    return active;
  };
  return {
    request,
    dispose: () => { disposed = true; pending = false; if (timer) clearTimeout(timer); timer = undefined; },
  };
}
