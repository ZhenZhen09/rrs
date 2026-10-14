export type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response | null>;

export type WebPushState = 'unsupported' | 'permission-denied' | 'unconfigured' | 'subscribed' | 'disabled';

export type WebPushStatus = {
  enabled: boolean;
  subscribed: boolean;
  state: WebPushState;
};

async function readJson<T>(response: Response, fallback: T): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Notification service returned an invalid response (${response.status}).`);
  }
}

function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function supportsWebPush() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext !== false &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function resolveWebPushState(input: {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  subscribed: boolean;
}): WebPushState {
  if (!input.supported || input.permission === 'unsupported') return 'unsupported';
  if (input.permission === 'denied') return 'permission-denied';
  if (!input.enabled) return 'unconfigured';
  if (input.subscribed) return 'subscribed';
  return 'disabled';
}

export async function getWebPushStatus(fetchWithAuth: AuthenticatedFetch): Promise<WebPushStatus> {
  const supported = supportsWebPush();
  if (!supported) {
    return { enabled: false, subscribed: false, state: resolveWebPushState({ supported, permission: 'unsupported', enabled: false, subscribed: false }) };
  }
  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const response = await fetchWithAuth('/api/notifications/web-push/status', {
    method: 'POST',
    body: JSON.stringify({ endpoint: subscription?.endpoint || null }),
  });
  if (!response?.ok) throw new Error('Unable to read browser notification settings.');
  const serverStatus = await readJson(response, { enabled: false, subscribed: false });
  const subscribed = Boolean(subscription && serverStatus.subscribed);
  return {
    enabled: Boolean(serverStatus.enabled),
    subscribed,
    state: resolveWebPushState({ supported, permission, enabled: Boolean(serverStatus.enabled), subscribed }),
  };
}

export async function enableWebPush(fetchWithAuth: AuthenticatedFetch) {
  if (!supportsWebPush()) throw new Error('This browser does not support push notifications.');

  const configResponse = await fetchWithAuth('/api/notifications/web-push/config');
  if (!configResponse?.ok) throw new Error('Unable to load notification settings.');
  const config = await readJson(configResponse, { enabled: false, publicKey: null }) as { enabled: boolean; publicKey: string | null };
  if (!config.enabled || !config.publicKey) throw new Error('Browser notifications are not configured yet.');

  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked in browser or device settings. Allow them there before enabling here.');
  }
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(config.publicKey),
    });
  }

  const response = await fetchWithAuth('/api/notifications/web-push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!response?.ok) throw new Error('Unable to save this device for notifications.');
}

export async function disableWebPush(fetchWithAuth: AuthenticatedFetch) {
  if (!supportsWebPush()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const response = await fetchWithAuth('/api/notifications/web-push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!response?.ok) throw new Error('Unable to disable browser notifications.');
  await subscription.unsubscribe();
}
