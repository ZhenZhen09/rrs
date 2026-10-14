import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TodayScreen from '../(tabs)/index';

const mockCheckIn = jest.fn();
const mockToggleDuty = jest.fn();
const mockRouter = { push: jest.fn() };
const mockDashboard = {
  tasks: [], loading: true, refreshing: false, onRefresh: jest.fn(), notifications: [], unreadCount: 0,
  isNotifOpen: false, setIsNotifOpen: jest.fn(), handleLogout: jest.fn(), handleNotificationClick: jest.fn(),
  handleMarkAllRead: jest.fn(), router: mockRouter,
};

jest.mock('@/context/LocationContext', () => ({
  useLocation: () => ({ isOnDuty: false, hasOpenShift: false, isShiftStatusReady: true, attendanceStatus: null, checkIn: mockCheckIn, toggleDuty: mockToggleDuty }),
}));
jest.mock('@/hooks/data/useDashboard', () => ({ useDashboard: () => mockDashboard }));
jest.mock('@/components/ScreenHeader', () => ({ ScreenHeader: () => null }));
jest.mock('@/components/RiderSurfaceGradient', () => ({ RiderSurfaceGradient: () => null }));
jest.mock('@/components/NotificationModal', () => ({ NotificationModal: () => null }));
jest.mock('@/components/ui/SkeletonCard', () => ({ SkeletonCard: () => null }));
jest.mock('@/hooks/useReducedMotionPreference', () => ({ useReducedMotionPreference: () => true }));

beforeEach(() => {
  mockCheckIn.mockReset().mockResolvedValue(true);
  mockToggleDuty.mockReset().mockResolvedValue('success');
});

it('opens the shift drawer to start attendance before the rider goes online', async () => {
  render(<TodayScreen />);
  expect(screen.queryByText('Good Morning!')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Start shift' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Open shift controls, Not started' }));
  expect(screen.getByRole('button', { name: 'Report absence or leave' })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Start shift' }));

  await waitFor(() => expect(mockCheckIn).toHaveBeenCalledWith('present'));
  expect(mockToggleDuty).not.toHaveBeenCalled();
});
