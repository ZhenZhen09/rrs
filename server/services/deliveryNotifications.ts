import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { enqueueWebPush, isPotentialWebPushType } from './webPushQueue';

export interface DeliveryNotificationExecutor {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface DeliveryNotification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  request_id: string;
}

export interface DeliveryPushOptions {
  send: (userId: string, title: string, body: string, data?: unknown, options?: { channelId?: string; categoryId?: string; tag?: string }) => Promise<unknown>;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId: 'delivery_updates' | 'delivery_urgent';
  categoryId?: string;
  tag?: string;
}

export async function publishSavedWebPushNotification(notification: DeliveryNotification): Promise<void> {
  if (!isPotentialWebPushType(notification.type)) return;
  try {
    await enqueueWebPush(notification.id);
  } catch {
    console.error('[WEB PUSH] Queueing saved notification failed.');
  }
}

export async function persistDeliveryNotification(
  executor: DeliveryNotificationExecutor,
  input: { recipientId: string; requestId: string; type: string; message: string },
): Promise<DeliveryNotification> {
  const notification: DeliveryNotification = {
    id: `notif_${randomUUID()}`,
    user_id: input.recipientId,
    request_id: input.requestId,
    type: input.type,
    message: input.message,
  };
  await executor.query(
    'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    [notification.id, notification.user_id, notification.message, notification.type, notification.request_id],
  );
  return notification;
}

export async function persistAdminDispatchNotifications(
  executor: DeliveryNotificationExecutor,
  input: { requestId: string; type: 'request_submitted' | 'assignment_cancelled' | 'deviation_requested'; message: string },
): Promise<DeliveryNotification[]> {
  const [admins] = await executor.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
  const notifications: DeliveryNotification[] = [];
  for (const admin of admins as Array<{ id: string }>) {
    notifications.push(await persistDeliveryNotification(executor, {
      recipientId: admin.id,
      requestId: input.requestId,
      type: input.type,
      message: input.message,
    }));
  }
  return notifications;
}

export async function publishDeliveryNotification(
  io: Pick<Server, 'to'> | null | undefined,
  notification: DeliveryNotification,
  options?: { push?: DeliveryPushOptions },
): Promise<void> {
  io?.to(notification.user_id).emit('notification-added', notification);
  await publishSavedWebPushNotification(notification);
  if (!options?.push) return;
  try {
    await options.push.send(
      notification.user_id,
      options.push.title,
      options.push.body,
      { ...options.push.data, notificationId: notification.id },
      { channelId: options.push.channelId, categoryId: options.push.categoryId, tag: options.push.tag },
    );
  } catch (error) {
    console.error(`[DELIVERY NOTIFICATION] Push failed for ${notification.request_id}:`, error);
  }
}
