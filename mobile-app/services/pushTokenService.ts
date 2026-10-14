import { api } from '@/utils/api';

type FcmMessagingClient = {
  getToken: () => Promise<string>;
  onTokenRefresh: (listener: (token: string) => void) => () => void;
};

export type PushPlatform = 'android' | 'ios';

export async function registerFcmTokenValue(token: string, platform: PushPlatform): Promise<void> {
  if (!token) return;
  await api.post('/api/notifications/register-token', { token, provider: 'fcm', platform });
}

export async function registerFcmToken(
  messaging: Pick<FcmMessagingClient, 'getToken'>,
  platform: PushPlatform,
): Promise<string | null> {
  const token = await messaging.getToken();
  if (!token) return null;
  await registerFcmTokenValue(token, platform);
  return token;
}

export function listenForFcmTokenRefresh(
  messaging: Pick<FcmMessagingClient, 'onTokenRefresh'>,
  platform: PushPlatform,
  onError: (error: unknown) => void = () => undefined,
): () => void {
  return messaging.onTokenRefresh((token) => {
    void registerFcmTokenValue(token, platform).catch(onError);
  });
}

export async function unregisterFcmToken(): Promise<void> {
  await api.post('/api/notifications/unregister-token', { provider: 'fcm' });
}
