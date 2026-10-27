import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TodayScreen from '../(tabs)/index';
import { useLocation } from '@/context/LocationContext';

const mockCheckIn = jest.fn();
const mockToggleDuty = jest.fn();
const mockRouter = { push: jest.fn() };
let mockConnectionState: 'checking' | 'online' | 'no_network' | 'service_unavailable' = 'online';
const mockDashboard = {
  tasks: [], loading: true, refreshing: false, onRefresh: jest.fn(), notifications: [], unreadCount: 0,
  isNotifOpen: false, setIsNotifOpen: jest.fn(), handleLogout: jest.fn(), handleNotificationClick: jest.fn(),
  handleMarkAllRead: jest.fn(), router: mockRouter,
};

jest.mock('@/context/LocationContext', () => ({
  useLocation: jest.fn(() => ({ isOnDuty: false, hasOpenShift: false, isShiftStatusReady: true, isNetworkReachable: true, attendanceStatus: null, checkIn: mockCheckIn, toggleDuty: mockToggleDuty })),
}));
jest.mock('@/hooks/data/useDashboard', () => ({ useDashboard: () => mockDashboard }));
jest.mock('@/context/ConnectionContext', () => ({ useConnection: () => ({ state: mockConnectionState, retry: jest.fn(), lastOnlineAt: null }) }));
jest.mock('@/components/ScreenHeader', () => ({ ScreenHeader: () => null }));
jest.mock('@/components/RiderSurfaceGradient', () => ({ RiderSurfaceGradient: () => null }));
jest.mock('@/components/NotificationModal', () => ({ NotificationModal: () => null }));
jest.mock('@/components/ui/SkeletonCard', () => ({ SkeletonCard: () => null }));
jest.mock('@/hooks/useReducedMotionPreference', () => ({ useReducedMotionPreference: () => true }));

beforeEach(() => {
  mockConnectionState = 'online';
  mockCheckIn.mockReset().mockResolvedValue(true);
  mockToggleDuty.mockReset().mockResolvedValue('success');
  mockRouter.push.mockReset();
  mockDashboard.tasks = [];
  (useLocation as jest.Mock).mockReturnValue({
    isOnDuty: false, hasOpenShift: false, isShiftStatusReady: true, isNetworkReachable: true,
    attendanceStatus: null, checkIn: mockCheckIn, toggleDuty: mockToggleDuty,
  });
});

it('shows On Duty directly after login and sends one duty request', async () => {
  render(<TodayScreen />);
  expect(screen.queryByText('Good Morning!')).toBeNull();
  expect(screen.getByRole('button', { name: 'On Duty' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Report absence or leave' })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'On Duty' }));

  await waitFor(() => expect(mockToggleDuty).toHaveBeenCalledWith(true));
  expect(mockCheckIn).not.toHaveBeenCalled();
});

it('keeps the saved active delivery accessible while status is being rechecked', () => {
  (useLocation as jest.Mock).mockReturnValue({
    isOnDuty: false,
    hasOpenShift: false,
    isShiftStatusReady: false,
    isNetworkReachable: false,
    attendanceStatus: null,
  });
  mockDashboard.tasks = [{
    request_id: 'active-1', delivery_status: 'in_progress', delivery_date: '2026-10-21',
    dropoff_location: { address: 'Saved drop-off address' },
  } as any];

  render(<TodayScreen />);

  expect(screen.getByText('Continue your active delivery')).toBeTruthy();
  expect(screen.getByText('Saved drop-off address')).toBeTruthy();
  expect(screen.getByText(/new assignments are held/i)).toBeTruthy();
  fireEvent.press(screen.getByTestId('offline-active-delivery'));
  expect(mockRouter.push).toHaveBeenCalledWith('/job/active-1');
});

it('masks task information until the rider presses On Duty', () => {
  mockDashboard.loading = false;
  mockDashboard.tasks = [{
    request_id: 'assigned-1', status: 'approved', delivery_status: 'assigned', delivery_date: new Date().toISOString().slice(0, 10),
    recipient_name: 'Hidden recipient', dropoff_location: { address: 'Hidden address' },
  } as any];

  render(<TodayScreen />);

  expect(screen.getByTestId('shift-task-access-notice')).toBeTruthy();
  expect(screen.queryByText('Hidden recipient')).toBeNull();
  expect(screen.queryByText('Hidden address')).toBeNull();
});

it('keeps assigned task details hidden during an open shift while Off Duty', () => {
  (useLocation as jest.Mock).mockReturnValue({
    isOnDuty: false, hasOpenShift: true, isShiftStatusReady: true, isNetworkReachable: true,
    attendanceStatus: 'present',
  });
  mockDashboard.loading = false;
  mockDashboard.tasks = [{
    request_id: 'assigned-1', status: 'approved', delivery_status: 'assigned', delivery_date: new Date().toISOString().slice(0, 10), is_overdue: false,
    recipient_name: 'Visible recipient', dropoff_location: { address: 'Visible address' },
  } as any];

  render(<TodayScreen />);

  expect(screen.getByRole('button', { name: 'On Duty' })).toBeTruthy();
  expect(screen.getByTestId('shift-task-access-notice')).toBeTruthy();
  expect(screen.queryByText('Visible recipient')).toBeNull();
  expect(screen.queryByText('Visible address')).toBeNull();
});

it('keeps an active delivery accessible when Wi-Fi works but Errands is unavailable', () => {
  mockConnectionState = 'service_unavailable';
  (useLocation as jest.Mock).mockReturnValue({
    isOnDuty: false,
    hasOpenShift: false,
    isShiftStatusReady: true,
    isNetworkReachable: true,
    attendanceStatus: null,
  });
  mockDashboard.tasks = [{
    request_id: 'active-service-outage', delivery_status: 'in_progress', delivery_date: '2026-10-21',
    dropoff_location: { address: 'Saved destination' },
  } as any];

  render(<TodayScreen />);

  expect(screen.getByText('Continue your active delivery')).toBeTruthy();
  expect(screen.getByText('Saved destination')).toBeTruthy();
  fireEvent.press(screen.getByTestId('offline-active-delivery'));
  expect(mockRouter.push).toHaveBeenCalledWith('/job/active-service-outage');
});

it('reveals assigned task details after the rider goes On Duty', () => {
  (useLocation as jest.Mock).mockReturnValue({
    isOnDuty: true, hasOpenShift: true, isShiftStatusReady: true, isNetworkReachable: true,
    attendanceStatus: 'present',
  });
  mockDashboard.loading = false;
  mockDashboard.tasks = [{
    request_id: 'assigned-1', status: 'approved', delivery_status: 'assigned',
    delivery_date: new Date().toISOString().slice(0, 10), is_overdue: false,
    recipient_name: 'Visible recipient', dropoff_location: { address: 'Visible address' },
  } as any];

  render(<TodayScreen />);
  expect(screen.getByText('Visible recipient')).toBeTruthy();
  expect(screen.getByText('Visible address')).toBeTruthy();
  expect(screen.getByTestId('today_task_card_0').props.accessibilityState.disabled).toBe(false);
});
