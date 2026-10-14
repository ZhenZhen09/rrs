type BackgroundMessagingClient = {
  setBackgroundMessageHandler: (listener: (message: unknown) => Promise<void>) => void;
};

export function registerFcmBackgroundHandler(
  platform: string,
  isExpoGo: boolean,
  messaging: BackgroundMessagingClient,
): boolean {
  if (platform === 'web' || isExpoGo) return false;
  messaging.setBackgroundMessageHandler(async () => undefined);
  return true;
}
