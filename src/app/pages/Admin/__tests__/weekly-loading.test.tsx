// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AnalyticsHub } from '../AnalyticsHub';
import { buildRequestAccounting } from '../../../utils/requestAccounting';

const { fetchWithAuth } = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
vi.mock('../../../context/DataContext', () => ({ useData: () => ({ fetchWithAuth }) }));
vi.mock('react-leaflet', () => ({ MapContainer: () => null, TileLayer: () => null, Circle: () => null, Popup: () => null }));
vi.mock('../../../components/Admin/OperationalIntegrityView', () => ({ OperationalIntegrityView: () => null }));
// The main tab charts do not participate in weekly load/error handling.
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(), ResponsiveContainer: () => null,
}));

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockImplementation(async (url: string) => url.includes('weekly-schedule')
    ? { ok: false, status: 500 }
    : { ok: false });
});
afterEach(cleanup);

describe('weekly analytics data loading', () => {
  it('shows the schedule and reconciled analytics together without report tabs', async () => {
    fetchWithAuth.mockImplementation(async (url: string) => {
      if (url.includes('weekly-schedule')) return { ok: true, json: async () => ({ requests: [] }) };
      if (url.includes('summary-stats')) return { ok: true, json: async () => ({ requests: [], counts: buildRequestAccounting([]) }) };
      if (url.includes('monthly-trend')) return { ok: true, json: async () => [] };
      return { ok: false };
    });

    render(<AnalyticsHub />);

    await screen.findByText('No scheduled requests for this week');
    expect(await screen.findByRole('region', { name: 'Request reconciliation' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Download weekly schedule' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Main Stats' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Weekly Schedule' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rider Connectivity' })).toBeNull();
  });

  it('shows a failed load as an error and recovers after retry', async () => {
    render(<AnalyticsHub />);
    expect(await screen.findByText('Unable to load weekly schedule. Please try again.')).toBeDefined();
    expect(screen.queryByText('No scheduled requests for this week')).toBeNull();
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ requests: [] }) });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No scheduled requests for this week');
    expect(screen.queryByText('Unable to load weekly schedule. Please try again.')).toBeNull();
  });

  it('rejects a malformed successful response instead of displaying an empty week', async () => {
    // Main analytics responses are outside this test; only the weekly route succeeds.
    fetchWithAuth.mockImplementation(async (url: string) => url.includes('weekly-schedule')
      ? { ok: true, json: async () => ({}) }
      : { ok: false });
    render(<AnalyticsHub />);
    await screen.findByText('Unable to load weekly schedule. Please try again.');
    expect(screen.queryByText('No scheduled requests for this week')).toBeNull();
  });

  it('keeps the selected week when an older response arrives later', async () => {
    let resolveOld!: (value: unknown) => void;
    const oldRequest = new Promise((resolve) => { resolveOld = resolve; });
    let weeklyRequests = 0;
    fetchWithAuth.mockImplementation((url: string) => {
      if (!url.includes('weekly-schedule')) return Promise.resolve({ ok: false });
      if (++weeklyRequests === 1) return oldRequest;
      return Promise.resolve({ ok: true, json: async () => ({ requests: [{
        request_id: 'selected-week-task', delivery_date: url.split('weekStart=')[1],
        delivery_status: 'completed', dropoff_building_name: 'Selected week destination',
      }] }) });
    });
    render(<AnalyticsHub />);
    await screen.findByRole('status', { name: 'Loading weekly schedule…' });
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    await screen.findAllByText('Selected week destination');
    await act(async () => { resolveOld({ ok: true, json: async () => ({ requests: [] }) }); });
    expect(screen.queryByText('No scheduled requests for this week')).toBeNull();
    expect(screen.getAllByText('Selected week destination').length).toBeGreaterThan(0);
  });

  it('does not crash when the week date field is cleared', async () => {
    fetchWithAuth.mockImplementation(async (url: string) => url.includes('weekly-schedule')
      ? { ok: true, json: async () => ({ requests: [] }) }
      : { ok: false });
    render(<AnalyticsHub />);
    await screen.findByText('No scheduled requests for this week');
    fireEvent.change(screen.getByLabelText('Select week'), { target: { value: '' } });
    expect(screen.getByText('No scheduled requests for this week')).toBeDefined();
  });
});

