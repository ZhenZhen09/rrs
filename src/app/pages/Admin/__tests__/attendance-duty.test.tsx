// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const { socket, toastInfo } = vi.hoisted(() => ({
  socket: { on: vi.fn(), off: vi.fn() },
  toastInfo: vi.fn(),
}));

vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket }) }));
vi.mock('../../../components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));
vi.mock('sonner', () => ({ toast: { info: toastInfo, error: vi.fn(), success: vi.fn() } }));

import { AttendanceDashboard } from '../AttendanceDashboard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('notifies admins when a rider changes duty status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  render(<AttendanceDashboard />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());

  const updateHandler = socket.on.mock.calls.find(([event]) => event === 'rider-status-updated')?.[1];
  expect(updateHandler).toBeTypeOf('function');

  act(() => updateHandler({ type: 'duty', riderId: 'rider-1', riderName: 'Riley Rider', is_on_duty: false }));

  expect(toastInfo).toHaveBeenCalledWith('Riley Rider is now Off duty');
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});

it('renders current duty independently from attendance and shift progress', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
    rider_id: 'rider-1', rider_name: 'Riley Rider', rider_email: 'riley@example.test',
    is_on_duty: false, status: 'present', reason: null, check_in_time: '2026-10-05 08:00:00',
    off_duty_time: null, created_at: null, active_task_count: 0, integrity_score: 100,
    sessions: [{ id: 'shift-1', start_time: '2026-10-05 08:00:00', end_time: null, session_state: 'open' }],
    total_worked_minutes: 0,
  }] }));

  render(<AttendanceDashboard />);

  expect((await screen.findAllByText('OFF DUTY')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('In progress').length).toBeGreaterThan(0);
});
