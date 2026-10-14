// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AttendanceDashboard } from '../AttendanceDashboard';

vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
vi.mock('../../../components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows the recorded reason and count of tasks that remain assigned after handover', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      rider_id: 'rider-1', rider_name: 'Riley Rider', rider_email: 'riley@example.test',
      status: 'present', reason: null, check_in_time: '2026-10-05 08:00:00',
      off_duty_time: '2026-10-05 16:00:00', created_at: null,
      active_task_count: 2, handover_reason: 'Vehicle breakdown', integrity_score: 100,
    }],
  }));

  render(<AttendanceDashboard />);

  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(await screen.findAllByText('Riley Rider')).not.toHaveLength(0);
  expect(await screen.findAllByText(/2 tasks remain assigned/i)).not.toHaveLength(0);
  expect(screen.getAllByText(/Vehicle breakdown/)).not.toHaveLength(0);
});
