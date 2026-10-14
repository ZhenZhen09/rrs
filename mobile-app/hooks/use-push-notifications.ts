import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import type { Notification } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { initializeDeliveryNotificationChannels, presentForegroundPushNotification, routeNotificationResponse, routePushData } from '@/services/deliveryNotifications';
import { getPushEventKey, invalidateRiderPushQueries } from '@/utils/pushNotificationEvents';
import { listenForFcmTokenRefresh, registerFcmToken } from '@/services/pushTokenService';
import { createFirebaseMessagingClient, type FirebaseMessagingApi } from '@/services/firebaseMessagingClient';

const DISABLE_PUSH = false;
let permissionDeniedThisSession = false;

const Notifications = Platform.OS === 'web' || isRunningInExpoGo()
  ? undefined
  : (require('expo-notifications') as typeof import('expo-notifications'));

function loadFirebaseMessaging() {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  try {
    const messagingModule = require('@react-native-firebase/messaging') as FirebaseMessagingApi;
    return createFirebaseMessagingClient(messagingModule);
  } catch {
    console.warn('[PUSH] Firebase Messaging is unavailable in this native build.');
    return null;
  }
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function usePushNotifications(userId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fcmToken, setFcmToken] = useState('');
  const [notification, setNotification] = useState<Notification | false>(false);
  const lastHandledResponses = useRef(new Set<string>());

  useEffect(() => {
    if (!Notifications || DISABLE_PUSH || !userId) return;
    const messaging = loadFirebaseMessaging();
    if (!messaging) return;

    let isMounted = true;
    const handledResponses = lastHandledResponses.current;
    const rememberResponse = (key: string | null) => {
      if (!key) return true;
      if (handledResponses.has(key)) return false;
      handledResponses.add(key);
      if (handledResponses.size > 100) {
        const oldest = handledResponses.values().next().value;
        if (oldest) handledResponses.delete(oldest);
      }
      return true;
    };
    const refreshForData = (data: Record<string, unknown>) => {
      invalidateRiderPushQueries(queryClient, userId, data);
    };
    const handleFirebaseOpen = (message: any) => {
      if (!isMounted || !message) return;
      const data = message.data || {};
      if (!rememberResponse(getPushEventKey(data, message.messageId))) return;
      refreshForData(data);
      routePushData(data, router as never);
    };
    const handleNotificationResponse = (response: import('expo-notifications').NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const fallback = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
      if (!rememberResponse(getPushEventKey(data, fallback))) return;
      refreshForData(data);
      routeNotificationResponse(response as never, router as never);
    };

    let unsubscribeTokenRefresh: () => void = () => {};
    void registerForPushNotificationsAsync(messaging)
      .then((token) => {
        if (!isMounted || !token) return;
        setFcmToken(token);
        unsubscribeTokenRefresh = listenForFcmTokenRefresh(messaging, Platform.OS as 'android' | 'ios', () => {
          console.warn('[PUSH] Unable to register a refreshed FCM token.');
        });
      })
      .catch(() => console.warn('[PUSH] FCM registration failed.'));

    const messageSubscription = messaging.onMessage((message) => {
      if (!isMounted) return;
      setNotification(message as Notification);
      refreshForData(message.data || {});
      void presentForegroundPushNotification(message).catch(() => {
        console.warn('[PUSH] Unable to show foreground notification.');
      });
    });
    const openedSubscription = messaging.onNotificationOpenedApp(handleFirebaseOpen);
    const notificationListener = Notifications.addNotificationReceivedListener((received) => {
      if (!isMounted) return;
      setNotification(received);
      refreshForData(received.request.content.data as Record<string, unknown>);
    });
    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    void messaging.getInitialNotification().then(handleFirebaseOpen).catch(() => undefined);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) return;
      handleNotificationResponse(response);
      void Notifications.clearLastNotificationResponseAsync();
    }).catch(() => undefined);

    return () => {
      isMounted = false;
      unsubscribeTokenRefresh();
      messageSubscription();
      openedSubscription();
      notificationListener.remove();
      responseListener.remove();
    };
  }, [queryClient, router, userId]);

  return { fcmToken, notification };
}

async function registerForPushNotificationsAsync(messaging: NonNullable<ReturnType<typeof loadFirebaseMessaging>>): Promise<string | null> {
  if (!Notifications || DISABLE_PUSH || isRunningInExpoGo() || !Device.isDevice || permissionDeniedThisSession) return null;

  await initializeDeliveryNotificationChannels();
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    if (existingStatus === 'denied' && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const current = await Notifications.getPermissionsAsync();
      if (current.canAskAgain === false) {
        permissionDeniedThisSession = true;
        return null;
      }
    }
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    permissionDeniedThisSession = true;
    return null;
  }

  return registerFcmToken(messaging, Platform.OS as 'android' | 'ios');
}
