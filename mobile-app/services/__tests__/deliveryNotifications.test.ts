jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: { openURL: jest.fn() },
}));
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
}));

import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { formatOverdueBody, routeNotificationResponse, initializeDeliveryNotificationChannels, presentForegroundPushNotification, updateActiveDeliveryNotification, syncActiveDeliveryNotifications } from '../deliveryNotifications';

beforeEach(() => jest.clearAllMocks());

describe('delivery notifications', () => {
  it('formats overdue minutes and routes legacy request_id payloads', () => {
    expect(formatOverdueBody('123', 1)).toBe('Delivery #123 is overdue by 1 minute.');
    expect(formatOverdueBody('123', 3)).toBe('Delivery #123 is overdue by 3 minutes.');
    const router = { push: jest.fn() };
    routeNotificationResponse({ notification: { request: { content: { data: { request_id: 'req_123' } } } } } as any, router as any);
    expect(router.push).toHaveBeenCalledWith('/job/req_123');
  });

  it('navigates to a conversation notification without stacking duplicate inbox destinations', () => {
    const router = { push: jest.fn(), navigate: jest.fn() };
    const response = {
      notification: { request: { content: { data: { type: 'conversation_message', conversationId: 'conversation-1' } } } },
    } as any;

    routeNotificationResponse(response, router as any);
    routeNotificationResponse(response, router as any);

    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith('/conversation/conversation-1');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('routes direct FCM payloads with camel-case request IDs to the job screen', () => {
    const router = { push: jest.fn(), navigate: jest.fn() };
    routeNotificationResponse({
      notification: { request: { content: { data: { requestId: 'job-22', eventId: 'event-22' } } } },
    } as any, router as any);

    expect(router.push).toHaveBeenCalledWith('/job/job-22');
  });

  it('routes CALL and OPEN MAP only when the payload has the required destination data', () => {
    const router = { push: jest.fn() };
    routeNotificationResponse({ actionIdentifier: 'CALL', notification: { request: { content: { data: { request_id: 'req_123', recipient_contact: '+639123456789' } } } } } as any, router as any);
    routeNotificationResponse({ actionIdentifier: 'OPEN_MAP', notification: { request: { content: { data: { request_id: 'req_123', dropoff_lat: 14.6, dropoff_lng: 121.0 } } } } } as any, router as any);
    expect(Linking.openURL).toHaveBeenNthCalledWith(1, 'tel:+639123456789');
    expect(Linking.openURL).toHaveBeenNthCalledWith(2, 'https://www.google.com/maps/dir/?api=1&destination=14.6,121');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('creates the urgent and standard Android channels', async () => {
    await initializeDeliveryNotificationChannels();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('delivery_updates', expect.objectContaining({ importance: Notifications.AndroidImportance.DEFAULT }));
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('delivery_urgent', expect.not.objectContaining({ sound: 'default' }));
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('delivery_urgent', expect.objectContaining({ importance: Notifications.AndroidImportance.HIGH, vibrationPattern: expect.any(Array) }));
  });

  it('shows an incoming messaging FCM notification in the urgent channel while foregrounded', async () => {
    await presentForegroundPushNotification({
      notification: { title: 'New message', body: 'You have a new conversation message.' },
      data: { type: 'conversation_message', conversationId: 'conversation-1', messageId: 'message-1' },
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({
        title: 'New message',
        body: 'You have a new conversation message.',
        data: expect.objectContaining({ type: 'conversation_message', conversationId: 'conversation-1' }),
      }),
      trigger: { channelId: 'delivery_urgent' },
    }));
  });

  it('uses one stable active notification identifier and clears it on completion', async () => {
    await updateActiveDeliveryNotification({ request_id: 'req_123', delivery_status: 'in_progress' }, { durationSeconds: 240 });
    await updateActiveDeliveryNotification({ request_id: 'req_123', delivery_status: 'completed' });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'active-delivery:req_123', content: expect.objectContaining({ sticky: true, body: 'Delivery #req_123 - ETA 4 min' }), trigger: { channelId: 'delivery_updates' } }));
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('active-delivery:req_123');
  });

  it('keeps the active notification during arrival and pickup status transitions', async () => {
    await updateActiveDeliveryNotification({ request_id: 'req_123', delivery_status: 'arrived_at_pickup' });
    await updateActiveDeliveryNotification({ request_id: 'req_123', delivery_status: 'picked_up' });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing active notification without newer ETA data', async () => {
    (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValueOnce([{
      request: { identifier: 'active-delivery:req_123', content: { data: { type: 'delivery_active' } } },
    }]);
    await syncActiveDeliveryNotifications([{ request_id: 'req_123', delivery_status: 'in_progress' }]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
