// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const { socket, toastSuccess } = vi.hoisted(() => ({
  socket: { on: vi.fn(), off: vi.fn() },
  toastSuccess: vi.fn(),
}));

vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket }) }));
vi.mock('../../../components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), success: toastSuccess } }));

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

it('labels automatic no-shows and lets admins clear the absence', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [autoAbsentRider] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
    .mockResolvedValueOnce({ ok: true, json: async () => [{ ...autoAbsentRider, status: null }] });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('confirm', vi.fn(() => true));

  render(<AttendanceDashboard />);

  expect(await screen.findAllByText('ABSENT · AUTO NO-SHOW')).not.toHaveLength(0);
  fireEvent.click((await screen.findAllByRole('button', { name: 'Clear Absence' }))[0]);

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(fetchMock.mock.calls[1][0]).toContain('/api/users/attendance/rider-1');
  expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
  expect(toastSuccess).toHaveBeenCalledWith('Absence cleared successfully');
});

it('keeps Clear Absence available for an approved automatic no-show', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
    ...autoAbsentRider,
    late_checkin_approved_by: 'admin-1', late_checkin_approved_by_name: 'Admin',
    late_checkin_approved_at: '2026-10-22 08:20:00',
  }] }));

  render(<AttendanceDashboard />);

  expect(await screen.findAllByText(/Late check-in approved by Admin at/)).not.toHaveLength(0);
  expect(screen.getAllByRole('button', { name: 'Clear Absence' })).not.toHaveLength(0);
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

