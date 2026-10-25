// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const { socket, toastError, toastSuccess } = vi.hoisted(() => ({
  socket: { on: vi.fn(), off: vi.fn() },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket }) }));
vi.mock('../../../components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: toastError, success: toastSuccess } }));

import { AttendanceDashboard } from '../AttendanceDashboard';

const autoAbsentRider = {
  rider_id: 'rider-1', rider_name: 'Riley Rider', rider_email: 'riley@example.test',
  is_on_duty: false, status: 'absent', reason: null, check_in_time: null,
  absence_source: 'automatic_no_show', auto_absent_at: '2026-10-22 08:15:00',
  late_checkin_approved_by: null, late_checkin_approved_by_name: null, late_checkin_approved_at: null,
  active_task_count: 0, integrity_score: 100, sessions: [], total_worked_minutes: 0,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('labels automatic no-shows and lets admins approve a late check-in', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [autoAbsentRider] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
    .mockResolvedValueOnce({ ok: true, json: async () => [{
      ...autoAbsentRider,
      late_checkin_approved_by: 'admin-1', late_checkin_approved_by_name: 'Admin',
      late_checkin_approved_at: '2026-10-22 08:20:00',
    }] });
  vi.stubGlobal('fetch', fetchMock);

  render(<AttendanceDashboard />);

  expect(await screen.findAllByText('ABSENT · AUTO NO-SHOW')).not.toHaveLength(0);
  const actions = await screen.findAllByRole('button', { name: 'Approve late check-in' });
  fireEvent.click(actions[0]);

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(fetchMock.mock.calls[1][0]).toContain('/api/users/attendance/rider-1/late-check-in-approval');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ date: '2026-10-22' });
  expect(toastSuccess).toHaveBeenCalledWith('Late check-in approved for Riley Rider');
  expect(await screen.findAllByText(/Late check-in approved by Admin at/)).not.toHaveLength(0);
  expect(screen.queryByRole('button', { name: 'Clear Absence' })).toBeNull();
});

it('keeps manual absences on the existing clear flow without late approval controls', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
    ...autoAbsentRider, absence_source: null,
  }] }));

  render(<AttendanceDashboard />);

  expect(await screen.findAllByText('ABSENT')).not.toHaveLength(0);
  expect(screen.queryByRole('button', { name: 'Approve late check-in' })).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Clear Absence' })).not.toHaveLength(0);
});

it('retains approval attribution after the rider checks in late', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
    ...autoAbsentRider, status: 'present', check_in_time: '2026-10-22 08:25:00',
    late_checkin_approved_by: 'admin-1', late_checkin_approved_by_name: 'Admin',
    late_checkin_approved_at: '2026-10-22 08:20:00',
  }] }));

  render(<AttendanceDashboard />);

  expect(await screen.findAllByText('PRESENT · LATE')).not.toHaveLength(0);
  expect(await screen.findAllByText(/Approved by Admin at/)).not.toHaveLength(0);
});

it('shows an actionable error when the server rejects an approval', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [autoAbsentRider] })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Approval is no longer eligible.' }) });
  vi.stubGlobal('fetch', fetchMock);

  render(<AttendanceDashboard />);
  fireEvent.click((await screen.findAllByRole('button', { name: 'Approve late check-in' }))[0]);

  await waitFor(() => expect(toastError).toHaveBeenCalledWith('Approval is no longer eligible.'));
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
