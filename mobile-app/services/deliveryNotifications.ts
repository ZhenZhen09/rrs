import { Linking, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type { Notification } from 'expo-notifications';

type ExpoNotifications = typeof import('expo-notifications');

function getNotifications(): ExpoNotifications | null {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  return require('expo-notifications') as ExpoNotifications;
}

type DeliveryNotificationData = {
  request_id?: string;
  requestId?: string;
  type?: string;
  recipient_contact?: string;
  dropoff_lat?: number | string;
  dropoff_lng?: number | string;
  conversationId?: string;
  destination?: string;
  campaignId?: string;
};

type ForegroundPushMessage = {
  notification?: { title?: string | null; body?: string | null };
  data?: Record<string, string | undefined>;
};

export async function presentForegroundPushNotification(message: ForegroundPushMessage): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;

  const data = message.data || {};
  const title = message.notification?.title;
  const body = message.notification?.body;
  if (!title && !body) return;

  const urgentTypes = new Set([
    'new_assignment', 'assignment_cancelled', 'conversation_message',
    'delivery_at_risk', 'delivery_overdue', 'delivery_overdue_reminder',
  ]);
  const channelId = urgentTypes.has(String(data.type || '')) ? 'delivery_urgent' : 'delivery_updates';
  await initializeDeliveryNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Rider update',
      body: body || '',
      data,
      sound: 'default',
    },
    trigger: { channelId },
  });
}

export function formatOverdueBody(id: string, minutes: number): string {
  return `Delivery #${id} is overdue by ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export async function initializeDeliveryNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync('delivery_updates', {
    name: 'Delivery updates', importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync('delivery_urgent', {
    name: 'Urgent delivery alerts', importance: Notifications.AndroidImportance.HIGH,
    // Android's default tone is not a packaged custom sound. Omitting sound
    // uses the system default and avoids Expo looking for a file named "default".
    vibrationPattern: [0, 300, 200, 300],
  });
  const view = { identifier: 'VIEW_TASK', buttonTitle: 'VIEW TASK', options: { opensAppToForeground: true } };
  const call = { identifier: 'CALL', buttonTitle: 'CALL', options: { opensAppToForeground: false } };
  const map = { identifier: 'OPEN_MAP', buttonTitle: 'OPEN MAP', options: { opensAppToForeground: false } };
  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK', [view]);
  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK_CALL', [view, call]);
  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK_MAP', [view, map]);
  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK_CALL_MAP', [view, call, map]);
}

export function presentDeliveryPush(notification: Notification) {
  const data = notification.request.content.data as DeliveryNotificationData;
  const content = notification.request.content;
  const urgent = data.type === 'delivery_overdue' || data.type === 'delivery_overdue_reminder';
  return {
    title: content.title || (urgent ? 'Delivery Overdue' : 'Delivery update'),
    body: content.body || '',
    data,
    ...(Platform.OS === 'android' ? {
      channelId: urgent ? 'delivery_urgent' : 'delivery_updates',
      categoryIdentifier: 'DELIVERY_TASK',
    } : {}),
  };
}

export function routeNotificationResponse(
  response: { actionIdentifier?: string; notification: { request: { content: { data: DeliveryNotificationData } } } },
  router: { push(path: never): void; navigate(path: never): void },
): void {
  const data = response.notification.request.content.data || {};
  if (data.conversationId && data.type === 'conversation_message') {
    // A push per message tap leaves duplicate conversation routes in the stack.
    // navigate reuses an existing destination when it is already in the stack.
    router.navigate(`/conversation/${encodeURIComponent(data.conversationId)}` as never);
    return;
  }
  if (response.actionIdentifier === 'CALL' && data.recipient_contact) {
    void Linking.openURL(`tel:${data.recipient_contact}`);
    return;
  }
  if (response.actionIdentifier === 'OPEN_MAP' && data.dropoff_lat != null && data.dropoff_lng != null) {
    const destination = `${encodeURIComponent(String(data.dropoff_lat))},${encodeURIComponent(String(data.dropoff_lng))}`;
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    return;
  }
  routePushData(data, router);
}

export function routePushData(
  data: DeliveryNotificationData,
  router: { push(path: never): void; navigate(path: never): void },
): void {
  if (data.conversationId && data.type === 'conversation_message') {
    router.navigate(`/conversation/${encodeURIComponent(data.conversationId)}` as never);
    return;
  }
  if (data.type === 'campaign' || data.type === 'campaign_test') {
    const routes: Record<string, string> = {
      dashboard: '/(tabs)', shift: '/(tabs)', today: '/(tabs)', overdue: '/(tabs)/overdue', inbox: '/(tabs)/inbox',
    };
    router.navigate((routes[String(data.destination || '')] || '/(tabs)') as never);
    return;
  }
  const requestId = data.request_id || data.requestId;
  if (requestId) router.push(`/job/${encodeURIComponent(requestId)}` as never);
}

const TERMINAL_DELIVERY_STATUSES = new Set(['completed', 'delivered', 'failed', 'cancelled', 'disapproved']);
const ONGOING_DELIVERY_STATUSES = new Set(['in_progress', 'in_transit', 'picked_up', 'arrived', 'arrived_at_pickup', 'arrived_at_dropoff']);

export async function updateActiveDeliveryNotification(
  job: { request_id: string; delivery_status?: string | null },
  eta?: { durationSeconds?: number } | null,
): Promise<void> {
  if (Platform.OS !== 'android' || !job.request_id) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  const identifier = `active-delivery:${job.request_id}`;
  const status = String(job.delivery_status || '').toLowerCase();
  if (TERMINAL_DELIVERY_STATUSES.has(status)) {
    await Notifications.dismissNotificationAsync(identifier);
    return;
  }
  if (!ONGOING_DELIVERY_STATUSES.has(status)) return;
  const etaMinutes = eta?.durationSeconds && eta.durationSeconds > 0
    ? ` - ETA ${Math.ceil(eta.durationSeconds / 60)} min`
    : '';
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Rider is on the way',
      body: `Delivery #${job.request_id}${etaMinutes}`,
      data: { request_id: job.request_id, type: 'delivery_active' },
      sticky: true,
    },
    trigger: { channelId: 'delivery_updates' },
  });
}

export async function clearActiveDeliveryNotification(requestId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (Notifications) await Notifications.dismissNotificationAsync(`active-delivery:${requestId}`);
}

export async function syncActiveDeliveryNotifications(jobs: Array<{ request_id: string; delivery_status?: string | null }>): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  const presented = await Notifications.getPresentedNotificationsAsync();
  const activeJobs = jobs.filter((job) => ONGOING_DELIVERY_STATUSES.has(String(job.delivery_status || '').toLowerCase()));
  const activeIdentifiers = new Set(activeJobs.map((job) => `active-delivery:${job.request_id}`));
  const visibleIdentifiers = new Set(presented
    .filter((notification) => notification.request.content.data?.type === 'delivery_active')
    .map((notification) => notification.request.identifier));
  await Promise.all(activeJobs
    .filter((job) => !visibleIdentifiers.has(`active-delivery:${job.request_id}`))
    .map((job) => updateActiveDeliveryNotification(job)));
  await Promise.all(presented
    .filter((notification) => notification.request.content.data?.type === 'delivery_active')
    .filter((notification) => !activeIdentifiers.has(notification.request.identifier))
    .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier)));
}
