jest.mock('expo', () => ({ isRunningInExpoGo: () => true }));
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: { openURL: jest.fn() },
}));
jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications must not be loaded in Expo Go');
});

describe('delivery notifications in Expo Go', () => {
  it('loads without importing native notification APIs and safely skips them', async () => {
    const deliveryNotifications = require('../deliveryNotifications');

    await expect(deliveryNotifications.initializeDeliveryNotificationChannels()).resolves.toBeUndefined();
    await expect(deliveryNotifications.updateActiveDeliveryNotification({
      request_id: 'request-1', delivery_status: 'in_progress',
    })).resolves.toBeUndefined();
    await expect(deliveryNotifications.syncActiveDeliveryNotifications([])).resolves.toBeUndefined();
    await expect(deliveryNotifications.clearActiveDeliveryNotification('request-1')).resolves.toBeUndefined();
  });
});
