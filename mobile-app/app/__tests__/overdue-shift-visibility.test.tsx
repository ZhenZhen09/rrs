import React from 'react';
import { render, screen } from '@testing-library/react-native';
import OverdueScreen from '../(tabs)/overdue';
import { useLocation } from '@/context/LocationContext';

const mockDashboard = {
  tasks: [], loading: false, refreshing: false, onRefresh: jest.fn(), notifications: [], unreadCount: 0,
  isNotifOpen: false, setIsNotifOpen: jest.fn(), handleLogout: jest.fn(), handleNotificationClick: jest.fn(),
  handleMarkAllRead: jest.fn(), router: { push: jest.fn() },
};

jest.mock('@/context/LocationContext', () => ({ useLocation: jest.fn() }));
jest.mock('@/hooks/data/useDashboard', () => ({ useDashboard: () => mockDashboard }));
jest.mock('@/components/ScreenHeader', () => ({ ScreenHeader: () => null }));
jest.mock('@/components/RiderSurfaceGradient', () => ({ RiderSurfaceGradient: () => null }));
jest.mock('@/components/NotificationModal', () => ({ NotificationModal: () => null }));
jest.mock('@/components/ShiftControlDrawer', () => ({ ShiftControlDrawer: () => null }));

describe('OverdueScreen task visibility', () => {
  beforeEach(() => {
    mockDashboard.tasks = [{
      request_id: 'overdue-private', status: 'approved', delivery_status: 'assigned',
      delivery_date: '2020-01-01', is_overdue: true, recipient_name: 'Private recipient',
      dropoff_location: { address: 'Private address' },
    } as any];
  });

  it('masks overdue task details before the server confirms a started shift', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, isShiftStatusReady: true, isNetworkReachable: true,
    });
    render(<OverdueScreen />);
    expect(screen.getByTestId('shift-task-access-notice')).toBeTruthy();
    expect(screen.queryByText('Private recipient')).toBeNull();
    expect(screen.queryByText('Private address')).toBeNull();
  });

  it('keeps overdue details masked while shift status is unresolved', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: false, isShiftStatusReady: false, isNetworkReachable: true,
    });
    render(<OverdueScreen />);
    expect(screen.getByTestId('shift-task-access-notice')).toBeTruthy();
    expect(screen.queryByText('Private recipient')).toBeNull();
    expect(screen.queryByText('Private address')).toBeNull();
  });

  it('keeps overdue details masked during an open shift until On Duty', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: false, hasOpenShift: true, isShiftStatusReady: true, isNetworkReachable: true,
    });
    render(<OverdueScreen />);
    expect(screen.getByTestId('shift-task-access-notice')).toBeTruthy();
    expect(screen.queryByText('Private recipient')).toBeNull();
    expect(screen.queryByText('Private address')).toBeNull();
  });

  it('reveals overdue details after On Duty', () => {
    (useLocation as jest.Mock).mockReturnValue({
      isOnDuty: true, hasOpenShift: true, isShiftStatusReady: true, isNetworkReachable: true,
    });
    render(<OverdueScreen />);
    expect(screen.getByText('Private recipient')).toBeTruthy();
    expect(screen.getByText('Private address')).toBeTruthy();
  });
});
