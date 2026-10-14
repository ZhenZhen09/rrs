// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableWebPush, getWebPushStatus, resolveWebPushState } from '../webPush';

const endpoint = 'https://push.example/current-device';
const localSubscription = {
  endpoint,
  toJSON: () => ({ endpoint, keys: { p256dh: 'p256dh-secret', auth: 'auth-secret' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};
const getSubscription = vi.fn();
const subscribe = vi.fn();
const registration = { pushManager: { getSubscription, subscribe } };
const requestPermission = vi.fn();
const authenticatedFetch = vi.fn();
const originalDescriptors = new Map<PropertyKey, PropertyDescriptor | undefined>();

function setProperty(target: object, key: PropertyKey, value: unknown) {
  if (!originalDescriptors.has(key)) originalDescriptors.set(key, Object.getOwnPropertyDescriptor(target, key));
  Object.defineProperty(target, key, { configurable: true, value });
}

function response(body: unknown) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) } as Response;
}

describe('browser Web Push state', () => {
  beforeEach(() => {
    originalDescriptors.clear();
    getSubscription.mockReset().mockResolvedValue(localSubscription);
    subscribe.mockReset().mockResolvedValue(localSubscription);
    localSubscription.unsubscribe.mockReset().mockResolvedValue(true);
    requestPermission.mockReset().mockResolvedValue('granted');
    authenticatedFetch.mockReset();
    setProperty(window, 'isSecureContext', true);
    setProperty(window, 'PushManager', class PushManager {});
    setProperty(window, 'Notification', { permission: 'granted', requestPermission });
    setProperty(navigator, 'serviceWorker', { ready: Promise.resolve(registration) });
  });

  afterEach(() => {
    for (const [key, descriptor] of originalDescriptors) {
      if (descriptor) Object.defineProperty(key === 'serviceWorker' ? navigator : window, key, descriptor);
      else if (key === 'serviceWorker') delete (navigator as any)[key];
      else delete (window as any)[key];
    }
  });

  it('distinguishes unsupported, denied, unconfigured, subscribed, and disabled devices', () => {
    expect(resolveWebPushState({ supported: false, permission: 'default', enabled: false, subscribed: false })).toBe('unsupported');
    expect(resolveWebPushState({ supported: true, permission: 'denied', enabled: true, subscribed: false })).toBe('permission-denied');
    expect(resolveWebPushState({ supported: true, permission: 'default', enabled: false, subscribed: false })).toBe('unconfigured');
    expect(resolveWebPushState({ supported: true, permission: 'granted', enabled: true, subscribed: true })).toBe('subscribed');
    expect(resolveWebPushState({ supported: true, permission: 'default', enabled: true, subscribed: false })).toBe('disabled');
  });

  it('checks subscription status for this browser endpoint without putting it in the URL', async () => {
    authenticatedFetch.mockResolvedValueOnce(response({ enabled: true, subscribed: true }));

    const status = await getWebPushStatus(authenticatedFetch);

    expect(status).toMatchObject({ enabled: true, subscribed: true, state: 'subscribed' });
    expect(authenticatedFetch).toHaveBeenCalledWith('/api/notifications/web-push/status', {
      method: 'POST', body: JSON.stringify({ endpoint }),
    });
  });

  it('reuses an existing browser subscription and skips a redundant permission prompt', async () => {
    authenticatedFetch.mockResolvedValueOnce(response({ enabled: true, publicKey: 'AQID' }))
      .mockResolvedValueOnce(response({ success: true }));

    await enableWebPush(authenticatedFetch);

    expect(getSubscription).toHaveBeenCalledTimes(1);
    expect(subscribe).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(authenticatedFetch).toHaveBeenLastCalledWith('/api/notifications/web-push/subscribe', {
      method: 'POST', body: JSON.stringify({ subscription: localSubscription.toJSON() }),
    });
  });

  it('does not repeat a permission prompt after the browser denied it', async () => {
    setProperty(window, 'Notification', { permission: 'denied', requestPermission });
    authenticatedFetch.mockResolvedValueOnce(response({ enabled: true, publicKey: 'AQID' }));

    await expect(enableWebPush(authenticatedFetch)).rejects.toThrow(/blocked in browser or device settings/i);

    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });
});
