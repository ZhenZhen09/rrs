// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Admin', email: 'admin@example.test' }, logout: vi.fn() }),
}));
vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
vi.mock('../../../components/Admin/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../DispatchConsole', () => ({ DispatchConsole: () => null }));
vi.mock('../AnalyticsHub', () => ({ AnalyticsHub: () => null }));
vi.mock('../UserManagement', () => ({ UserManagement: () => null }));
vi.mock('../ThemeSelection', () => ({ default: () => null }));
vi.mock('../CalendarView', () => ({ CalendarView: () => null }));
vi.mock('../RiderMap', () => ({ RiderMap: () => null }));
vi.mock('../AttendanceDashboard', () => ({ AttendanceDashboard: () => null }));
vi.mock('../AdminMessaging', () => ({ AdminMessaging: () => null }));

import { AdminLayout } from '../AdminLayout';

describe('admin sidebar navigation order', () => {
  it('shows operations, monitoring, and administration in the agreed order', () => {
    render(<MemoryRouter><AdminLayout /></MemoryRouter>);

    const mainMenu = screen.getAllByText('Main Menu')[0].closest('nav');
    expect(mainMenu).not.toBeNull();
    const labels = within(mainMenu!).getAllByRole('button').map(button => button.textContent?.trim());

    expect(labels.slice(0, 7)).toEqual([
      'Dispatch Console',
      'Calendar View',
      'Rider Map',
      'Inbox',
      'Attendance',
      'Analytics Hub',
      'User Management',
    ]);
  });
});
