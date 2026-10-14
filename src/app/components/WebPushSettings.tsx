import { useCallback, useEffect, useState } from 'react';
import { disableWebPush, enableWebPush, getWebPushStatus, type AuthenticatedFetch, type WebPushStatus } from '../utils/webPush';

const STATUS_COPY: Record<WebPushStatus['state'], string> = {
  unsupported: 'This browser does not support browser push. Your in-app notification inbox is still available.',
  'permission-denied': 'Browser notifications are blocked in browser or device settings. Allow them there before enabling this device.',
  unconfigured: 'Browser push is not configured on this server. Your in-app notification inbox is still available.',
  subscribed: 'This browser and device can receive approved request notifications.',
  disabled: 'Browser notifications are off on this device.',
};

export function WebPushSettings({ fetchWithAuth }: { fetchWithAuth: AuthenticatedFetch }) {
  const [status, setStatus] = useState<WebPushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const nextStatus = await getWebPushStatus(fetchWithAuth);
    setStatus(nextStatus);
    return nextStatus;
  }, [fetchWithAuth]);

  useEffect(() => {
    let active = true;
    getWebPushStatus(fetchWithAuth).then((nextStatus) => {
      if (active) setStatus(nextStatus);
    }).catch(() => {
      if (active) setError('Could not read this device’s browser notification settings.');
    });
    return () => { active = false; };
  }, [fetchWithAuth]);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      await enableWebPush(fetchWithAuth);
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to enable browser notifications.');
      try { await refreshStatus(); } catch { /* Keep the enable error visible if status is unavailable too. */ }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    try {
      await disableWebPush(fetchWithAuth);
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to disable browser notifications.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="web-push-heading" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="web-push-heading" className="font-bold text-slate-900">Browser notifications</h2>
      <p className="mt-1 text-sm leading-5 text-slate-600">
        Get browser alerts for important request updates on this device. Your in-app inbox remains available.
      </p>
      <p role="status" aria-live="polite" className="mt-3 text-sm leading-5 text-slate-700">
        {status ? STATUS_COPY[status.state] : 'Checking this device’s browser notification settings…'}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Browser and operating system settings control permission and can turn notifications off at any time.
      </p>
      {status?.state === 'disabled' && (
        <button type="button" onClick={handleEnable} disabled={busy} className="mt-4 min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
          {busy ? 'Enabling…' : 'Enable browser notifications'}
        </button>
      )}
      {status?.state === 'subscribed' && (
        <button type="button" onClick={handleDisable} disabled={busy} className="mt-4 min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
          {busy ? 'Disabling…' : 'Disable browser notifications'}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{error}</p>}
    </section>
  );
}
