import { listenForFcmTokenRefresh, registerFcmToken, unregisterFcmToken } from '../pushTokenService';
import { api } from '@/utils/api';

jest.mock('@/utils/api', () => ({ api: { post: jest.fn() } }));

describe('FCM push token service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a native token with provider and platform metadata', async () => {
    const messaging = { getToken: jest.fn().mockResolvedValue('native-fcm-token') };

    await registerFcmToken(messaging as any, 'android');

    expect(api.post).toHaveBeenCalledWith('/api/notifications/register-token', {
      token: 'native-fcm-token', provider: 'fcm', platform: 'android',
    });
  });

  it('skips registration when Firebase has no token yet', async () => {
    const messaging = { getToken: jest.fn().mockResolvedValue('') };

    await expect(registerFcmToken(messaging as any, 'ios')).resolves.toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('unregisters the authenticated device FCM token', async () => {
    await unregisterFcmToken();
    expect(api.post).toHaveBeenCalledWith('/api/notifications/unregister-token', { provider: 'fcm' });
  });

  it('registers rotated Firebase tokens and returns the listener cleanup', async () => {
    const stopListening = jest.fn();
    let refresh: ((token: string) => void) | undefined;
    const messaging = {
      onTokenRefresh: jest.fn((listener) => {
        refresh = listener;
        return stopListening;
      }),
    };

    const unsubscribe = listenForFcmTokenRefresh(messaging as any, 'ios');
    refresh?.('rotated-token');
    await Promise.resolve();

    expect(api.post).toHaveBeenCalledWith('/api/notifications/register-token', {
      token: 'rotated-token', provider: 'fcm', platform: 'ios',
    });
    unsubscribe();
    expect(stopListening).toHaveBeenCalledTimes(1);
  });
});
