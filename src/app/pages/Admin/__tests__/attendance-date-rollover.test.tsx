// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AttendanceDashboard } from '../AttendanceDashboard';

vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
vi.mock('../../../components/Admin/ConflictResolutionModal', () => ({ ConflictResolutionModal: () => null }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('moves the default attendance view to the new Philippine date at midnight', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-09T15:00:00.000Z'));
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal('fetch', fetchMock);

  render(<AttendanceDashboard />);
  await act(async () => { await Promise.resolve(); });
  expect(fetchMock.mock.calls[0][0]).toContain('date=2026-10-09');

  await act(async () => {
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    await Promise.resolve();
  });
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('date=2026-10-10'))).toBe(true);
});
