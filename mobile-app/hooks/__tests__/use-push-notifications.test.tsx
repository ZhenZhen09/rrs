import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePushNotifications } from '../use-push-notifications';

const mockInvalidateQueries = jest.fn();
const mockRegisterFcmToken = jest.fn();
const mockListenForFcmTokenRefresh = jest.fn();
const mockPresentForegroundPushNotification = jest.fn().mockResolvedValue(undefined);
const mockGetToken = jest.fn();
const mockOnMessage = jest.fn();
const mockOnNotificationOpenedApp = jest.fn();
const mockGetInitialNotification = jest.fn();
const mockSetBackgroundMessageHandler = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockRemove = jest.fn();

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }) }));
jest.mock('@/services/deliveryNotifications', () => ({
  initializeDeliveryNotificationChannels: jest.fn().mockResolvedValue(undefined),
  presentForegroundPushNotification: (...args: unknown[]) => mockPresentForegroundPushNotification(...args),
  routeNotificationResponse: jest.fn(),
  routePushData: jest.fn((data, router) => {
    if (data.conversationId) router.navigate(`/conversation/${data.conversationId}`);
    else if (data.request_id || data.requestId) router.push(`/job/${data.request_id || data.requestId}`);
  }),
}));
jest.mock('@/services/pushTokenService', () => ({
  registerFcmToken: (...args: unknown[]) => mockRegisterFcmToken(...args),
  listenForFcmTokenRefresh: (...args: unknown[]) => mockListenForFcmTokenRefresh(...args),
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  addNotificationReceivedListener: (...args: unknown[]) => mockAddNotificationReceivedListener(...args),
  addNotificationResponseReceivedListener: (...args: unknown[]) => mockAddNotificationResponseReceivedListener(...args),
  getLastNotificationResponseAsync: (...args: unknown[]) => mockGetLastNotificationResponseAsync(...args),
  clearLastNotificationResponseAsync: jest.fn(),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: () => ({ id: 'mock-messaging' }),
  getToken: (_messaging: unknown, ...args: unknown[]) => mockGetToken(...args),
  onMessage: (_messaging: unknown, ...args: unknown[]) => mockOnMessage(...args),
  onNotificationOpenedApp: (_messaging: unknown, ...args: unknown[]) => mockOnNotificationOpenedApp(...args),
  getInitialNotification: (_messaging: unknown, ...args: unknown[]) => mockGetInitialNotification(...args),
  setBackgroundMessageHandler: (_messaging: unknown, ...args: unknown[]) => mockSetBackgroundMessageHandler(...args),
}));

function captureSubscription(mockSubscribe: jest.Mock) {
  let listener: ((value: any) => void) | undefined;
  mockSubscribe.mockImplementation((...args) => {
    const callback = args[args.length - 1];
    listener = callback;
    return mockRemove;
  });
  return () => listener;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('native-fcm-token');
  mockRegisterFcmToken.mockResolvedValue('native-fcm-token');
  mockListenForFcmTokenRefresh.mockReturnValue(mockRemove);
  mockGetInitialNotification.mockResolvedValue(null);
  mockGetLastNotificationResponseAsync.mockResolvedValue(null);
  mockOnMessage.mockReturnValue(mockRemove);
  mockOnNotificationOpenedApp.mockReturnValue(mockRemove);
  mockAddNotificationReceivedListener.mockReturnValue({ remove: mockRemove });
  mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: mockRemove });
});

it('registers a native FCM token for the signed-in rider', async () => {
  const { unmount } = renderHook(() => usePushNotifications('rider-1'));

  await waitFor(() => expect(mockRegisterFcmToken).toHaveBeenCalled());
  expect(['android', 'ios']).toContain(mockRegisterFcmToken.mock.calls[0][1]);
  expect(mockListenForFcmTokenRefresh).toHaveBeenCalled();
  unmount();
  expect(mockRemove).toHaveBeenCalled();
});

it('refreshes rider queries and captures the alert when an FCM message arrives in foreground', async () => {
  const getListener = captureSubscription(mockOnMessage);
  const { result } = renderHook(() => usePushNotifications('rider-1'));
  await waitFor(() => expect(getListener()).toBeDefined());

  await act(async () => getListener()?.({
    messageId: 'event-1',
    notification: { title: 'New delivery', body: 'A task was assigned.' },
    data: { eventId: 'event-1', request_id: 'job-1', type: 'new_assignment' },
  }));

  expect(mockInvalidateQueries.mock.calls.map(([query]) => query.queryKey)).toEqual([
    ['notifications', 'rider-1'], ['tasks', 'rider-1'], ['historyTasks', 'rider-1'], ['job', 'rider-1', 'job-1'],
  ]);
  expect(result.current.notification).toMatchObject({ messageId: 'event-1' });
  expect(mockPresentForegroundPushNotification).toHaveBeenCalledWith(expect.objectContaining({
    notification: expect.objectContaining({ title: 'New delivery', body: 'A task was assigned.' }),
  }));
});

it('routes an FCM notification tap and ignores a duplicate callback', async () => {
  const getOpenedListener = captureSubscription(mockOnNotificationOpenedApp);
  renderHook(() => usePushNotifications('rider-1'));
  await waitFor(() => expect(getOpenedListener()).toBeDefined());
  const message = { messageId: 'event-2', data: { eventId: 'event-2', requestId: 'job-2' } };

  await act(async () => {
    getOpenedListener()?.(message);
    getOpenedListener()?.(message);
  });

  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/job/job-2');
});

it('routes an app cold-started from an FCM notification', async () => {
  mockGetInitialNotification.mockResolvedValueOnce({
    messageId: 'event-3', data: { eventId: 'event-3', conversationId: 'conversation-3', type: 'conversation_message' },
  });
  renderHook(() => usePushNotifications('rider-1'));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/conversation/conversation-3'));
});
