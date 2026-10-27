import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import type { ExpoPushToken, Notification } from 'expo-notifications';
import { useRouter } from 'expo-router';

const isAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();
const Notifications = isAndroidExpoGo
  ? undefined
  : (require('expo-notifications') as typeof import('expo-notifications'));

// Keep Expo Go startup independent of notification APIs. Socket updates still
// appear as in-app toasts, while Android system notification APIs are skipped.
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

export interface PushNotificationState {
  expoPushToken?: ExpoPushToken;
  notification?: Notification;
}

export const usePushNotifications = (): PushNotificationState => {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notification | undefined>();
  
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  async function registerForPushNotificationsAsync() {
    if (!Notifications) return;
    let token;
    
    // Defensive guard in case this helper is called outside its usual hook path.
    if (isRunningInExpoGo() && Platform.OS === 'android') {
      console.log('Android Expo Go notification APIs are skipped; in-app notifications remain enabled.');
      return;
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get permissions for push notifications!');
        return;
      }
      
      // Note: We are currently relying on Local Notifications triggered by Socket events.
      // If you ever want to send push notifications directly from your backend while the app is closed,
      // you will need to link the app to an EAS project and uncomment the below code:
      /*
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId) {
          token = await Notifications.getExpoPushTokenAsync({ projectId });
        }
      } catch (e) {
        console.log("Expo Push Token skipped (requires EAS project ID). Local notifications will still work.");
      }
      */
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('delivery-updates', {
        name: 'Delivery updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  useEffect(() => {
    if (!Notifications) return;
    let active = true;

    registerForPushNotificationsAsync().then((token) => {
      if (active) setExpoPushToken(token);
      // Here you would typically send the token to your backend via API
      // api.post('/users/push-token', { token: token.data });
    });

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (active) setNotification(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification 
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const requestId = response.notification.request.content.data?.requestId;
      if (typeof requestId === 'string' && requestId) {
        router.push({ pathname: '/job/[id]', params: { id: requestId } });
      }
    });

    return () => {
      active = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return { expoPushToken, notification };
};
