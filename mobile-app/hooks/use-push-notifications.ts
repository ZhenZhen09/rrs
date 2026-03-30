import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '@/utils/api';

// Disable push notifications for testing to prevent Expo Go errors
const DISABLE_PUSH = true; 

/**
 * Hook to manage push notifications.
 * Currently disabled to prevent errors during Expo Go testing.
 */
export function usePushNotifications(userId?: string) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (DISABLE_PUSH) {
      console.log("Push notifications disabled for testing");
      return;
    }

    if (!userId) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        api.post('/api/users/push-token', { userId, pushToken: token })
          .catch(err => console.error('Failed to register push token:', err));
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped!', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  if (DISABLE_PUSH) return null;
  
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId || "rider-scheduling-app",
      })).data;
    } catch (e) {
      console.log('Could not get push token', e);
    }
  }

  return token;
}
