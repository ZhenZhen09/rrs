export type FirebaseMessagingClient = {
  getToken: () => Promise<string>;
  onTokenRefresh: (listener: (token: string) => void) => () => void;
  onMessage: (listener: (message: any) => void) => () => void;
  onNotificationOpenedApp: (listener: (message: any) => void) => () => void;
  getInitialNotification: () => Promise<any | null>;
  setBackgroundMessageHandler: (listener: (message: unknown) => Promise<void>) => void;
};

export type FirebaseMessagingApi = {
  getMessaging: () => unknown;
  getToken: (messaging: unknown) => Promise<string>;
  onTokenRefresh: (messaging: unknown, listener: (token: string) => void) => () => void;
  onMessage: (messaging: unknown, listener: (message: any) => void) => () => void;
  onNotificationOpenedApp: (messaging: unknown, listener: (message: any) => void) => () => void;
  getInitialNotification: (messaging: unknown) => Promise<any | null>;
  setBackgroundMessageHandler: (messaging: unknown, listener: (message: unknown) => Promise<void>) => void;
};

export function createFirebaseMessagingClient(api: FirebaseMessagingApi): FirebaseMessagingClient {
  const messaging = api.getMessaging();

  return {
    getToken: () => api.getToken(messaging),
    onTokenRefresh: (listener) => api.onTokenRefresh(messaging, listener),
    onMessage: (listener) => api.onMessage(messaging, listener),
    onNotificationOpenedApp: (listener) => api.onNotificationOpenedApp(messaging, listener),
    getInitialNotification: () => api.getInitialNotification(messaging),
    setBackgroundMessageHandler: (listener) => api.setBackgroundMessageHandler(messaging, listener),
  };
}
