// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AttendanceDashboard } from '../AttendanceDashboard';

vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
vi.mock('../../../components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows independent shift sessions, an open session, handover data, and closed time total', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
    rider_id: 'rider-1', rider_name: 'Riley Rider', rider_email: 'riley@example.test',
    status: 'present', reason: null, check_in_time: '2026-10-05 08:00:00', off_duty_time: null,
    created_at: null, active_task_count: 1, integrity_score: 100, total_worked_minutes: 480,
    sessions: [
      { id: 's4', start_time: '2026-10-05 07:00:00', end_time: null, session_state: 'legacy_unknown', duration_minutes: null, handover_reason: null, active_task_count_at_end: null },
      { id: 's1', start_time: '2026-10-05 08:00:00', end_time: '2026-10-05 12:00:00', session_state: 'closed', duration_minutes: 240, handover_reason: 'Vehicle issue', active_task_count_at_end: 1 },
      { id: 's2', start_time: '2026-10-05 13:00:00', end_time: '2026-10-05 17:00:00', session_state: 'closed', duration_minutes: 240, handover_reason: null, active_task_count_at_end: 0 },
      { id: 's3', start_time: '2026-10-05 18:00:00', end_time: null, session_state: 'open', duration_minutes: null, handover_reason: null, active_task_count_at_end: null },
    ],
  }] }));
  render(<AttendanceDashboard />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(await screen.findAllByText(/Shift sessions \(4\)/)).not.toHaveLength(0);
  expect(screen.getAllByText(/Total 8h 0m/)).not.toHaveLength(0);
  expect(screen.getAllByText('In progress').length).toBeGreaterThan(1);
  expect(screen.getAllByText('End time unknown').length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Vehicle issue/)).not.toHaveLength(0);
});

it('shows an attendance API error instead of presenting it as an empty day', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ error: 'Failed to fetch attendance' }),
  }));
  render(<AttendanceDashboard />);
  expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
  expect(screen.getAllByText(/Failed to fetch attendance/i).length).toBeGreaterThan(0);
  expect(screen.queryByText('No attendance records found')).toBeNull();
});

it('labels riders with no shift record instead of showing blank start and end values', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      rider_id: 'rider-2', rider_name: 'Jordan Rider', rider_email: 'jordan@example.test',
      status: null, reason: null, check_in_time: null, off_duty_time: null, created_at: null,
      active_task_count: 0, integrity_score: 100, sessions: [], total_worked_minutes: 0,
    }],
  }));
  render(<AttendanceDashboard />);
  expect((await screen.findAllByText('No shift recorded')).length).toBeGreaterThanOrEqual(2);
});

it('does not display a non-present attendance timestamp as a shift start', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      rider_id: 'rider-3', rider_name: 'Taylor Rider', rider_email: 'taylor@example.test',
      status: 'absent', reason: 'Sick', check_in_time: '2026-10-09 08:00:00', off_duty_time: null,
      created_at: null, active_task_count: 0, integrity_score: 100, sessions: [], total_worked_minutes: 0,
    }],
  }));
  render(<AttendanceDashboard />);
  expect((await screen.findAllByText('No shift recorded')).length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText('8:00 AM')).toBeNull();
});

it('surfaces an unknown legacy end time in the shift summary', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      rider_id: 'rider-4', rider_name: 'Morgan Rider', rider_email: 'morgan@example.test',
      status: 'present', reason: null, check_in_time: '2026-10-04 08:00:00', off_duty_time: null,
      created_at: null, active_task_count: 0, integrity_score: 100, total_worked_minutes: 0,
      sessions: [{ id: 'legacy', start_time: '2026-10-04 08:00:00', end_time: null, session_state: 'legacy_unknown', duration_minutes: null, handover_reason: null, active_task_count_at_end: null }],
    }],
  }));
  render(<AttendanceDashboard />);
  expect((await screen.findAllByText('End time unknown')).length).toBeGreaterThan(1);
});
