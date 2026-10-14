import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

export type FcmPriority = 'high' | 'normal';

export type FcmNotification = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  categoryId?: string;
  tag?: string;
  priority?: FcmPriority;
};

function getFirebaseMessaging(): Messaging {
  const existingApp = getApps()[0];
  const app = existingApp || initializeApp({
    ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
    credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : applicationDefault(),
  });
  return getMessaging(app);
}

function toFcmData(data?: Record<string, unknown>): Record<string, string> | undefined {
  if (!data) return undefined;
  return Object.fromEntries(Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
}

export async function sendFcmNotification(
  token: string,
  notification: FcmNotification,
  messaging: Pick<Messaging, 'send'> = getFirebaseMessaging(),
): Promise<string> {
  const priority = notification.priority || 'high';
  return messaging.send({
    token,
    notification: { title: notification.title, body: notification.body },
    ...(notification.data ? { data: toFcmData(notification.data) } : {}),
    android: {
      priority,
      notification: {
        channelId: notification.channelId || 'default',
        ...(notification.tag ? { tag: notification.tag } : {}),
      },
    },
    apns: {
      headers: { 'apns-priority': priority === 'high' ? '10' : '5' },
      payload: {
        aps: {
          sound: 'default',
          ...(notification.categoryId ? { category: notification.categoryId } : {}),
          ...(notification.tag ? { threadId: notification.tag } : {}),
        },
      },
    },
  });
}

export function isPermanentFcmTokenError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}
