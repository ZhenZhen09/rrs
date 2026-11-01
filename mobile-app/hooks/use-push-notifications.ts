import { useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
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
function getPushErrorDetails(error: unknown) {
  const value = error as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { code?: string; error?: string } };
  } | null;
  return {
    code: value?.response?.data?.code || value?.code,
    status: value?.response?.status,
    message: value?.response?.data?.error || value?.message || 'Unknown push registration error',
  };
}

const Notifications = Platform.OS === 'web' || isRunningInExpoGo()
  ? undefined
  : (require('expo-notifications') as typeof import('expo-notifications'));

function loadFirebaseMessaging() {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  try {
    const messagingModule = require('@react-native-firebase/messaging') as FirebaseMessagingApi;
    return createFirebaseMessagingClient(messagingModule);
  } catch (error) {
    console.warn('[PUSH] Firebase Messaging is unavailable in this native build.', getPushErrorDetails(error));
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

    let unsubscribeTokenRefresh: (() => void) | null = null;
    let registrationInFlight: Promise<void> | null = null;
    const registerCurrentToken = () => {
      if (!isMounted || registrationInFlight) return registrationInFlight;
      registrationInFlight = (async () => {
        try {
          const token = await registerForPushNotificationsAsync(messaging);
          if (!isMounted || !token) return;
          setFcmToken(token);
          if (!unsubscribeTokenRefresh) {
            unsubscribeTokenRefresh = listenForFcmTokenRefresh(messaging, Platform.OS as 'android' | 'ios', (error) => {
              console.warn('[PUSH] Unable to register a refreshed FCM token.', getPushErrorDetails(error));
            });
          }
        } catch (error) {
          console.warn('[PUSH] FCM registration failed.', getPushErrorDetails(error));
        } finally {
          registrationInFlight = null;
        }
      })();
      return registrationInFlight;
    };

    void registerCurrentToken();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      // Riders may grant notification permission in Android Settings while the app
      // is backgrounded. Recheck permission and register the current token on return.
      if (state === 'active') void registerCurrentToken();
    });

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
      appStateSubscription.remove();
      unsubscribeTokenRefresh?.();
      messageSubscription();
      openedSubscription();
      notificationListener.remove();
      responseListener.remove();
    };
  }, [queryClient, router, userId]);

  return { fcmToken, notification };
}

async function registerForPushNotificationsAsync(messaging: NonNullable<ReturnType<typeof loadFirebaseMessaging>>): Promise<string | null> {
  if (!Notifications || DISABLE_PUSH || isRunningInExpoGo() || !Device.isDevice) return null;

  await initializeDeliveryNotificationChannels();
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    if (existingStatus === 'denied' && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const current = await Notifications.getPermissionsAsync();
      if (current.canAskAgain === false) {
        return null;
      }
    }
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  return registerFcmToken(messaging, Platform.OS as 'android' | 'ios');
}
