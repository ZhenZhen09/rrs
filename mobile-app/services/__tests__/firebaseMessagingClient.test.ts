import { createFirebaseMessagingClient } from '../firebaseMessagingClient';

describe('Firebase Messaging client adapter', () => {
  it('uses the modular Firebase Messaging API rather than a default callable export', async () => {
    const instance = { id: 'messaging-instance' };
    const api = {
      getMessaging: jest.fn(() => instance),
      getToken: jest.fn(async () => 'fcm-token'),
      onTokenRefresh: jest.fn(() => jest.fn()),
      onMessage: jest.fn(() => jest.fn()),
      onNotificationOpenedApp: jest.fn(() => jest.fn()),
      getInitialNotification: jest.fn(async () => null),
      setBackgroundMessageHandler: jest.fn(),
    };
    const client = createFirebaseMessagingClient(api);

    await expect(client.getToken()).resolves.toBe('fcm-token');
    client.onTokenRefresh(() => undefined);
    client.onMessage(() => undefined);
    client.onNotificationOpenedApp(() => undefined);
    await client.getInitialNotification();
    client.setBackgroundMessageHandler(async () => undefined);

    expect(api.getMessaging).toHaveBeenCalledTimes(1);
    expect(api.getToken).toHaveBeenCalledWith(instance);
    expect(api.onTokenRefresh).toHaveBeenCalledWith(instance, expect.any(Function));
    expect(api.onMessage).toHaveBeenCalledWith(instance, expect.any(Function));
    expect(api.onNotificationOpenedApp).toHaveBeenCalledWith(instance, expect.any(Function));
    expect(api.getInitialNotification).toHaveBeenCalledWith(instance);
    expect(api.setBackgroundMessageHandler).toHaveBeenCalledWith(instance, expect.any(Function));
  });
});
