// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AnalyticsHub } from '../AnalyticsHub';
import { buildRequestAccounting } from '../../../utils/requestAccounting';

const { fetchWithAuth } = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
vi.mock('../../../context/DataContext', () => ({ useData: () => ({ fetchWithAuth }) }));
vi.mock('react-leaflet', () => ({ MapContainer: () => null, TileLayer: () => null, Circle: () => null, Popup: () => null }));
vi.mock('../../../components/Admin/OperationalIntegrityView', () => ({ OperationalIntegrityView: () => null }));
vi.mock('recharts', async (importOriginal) => ({ ...await importOriginal<typeof import('recharts')>(), ResponsiveContainer: () => null }));
const requests = [
  { request_id: 'pending-record', status: 'pending' },
  { request_id: 'active-record', status: 'approved', delivery_status: 'assigned', is_overdue: true },
  { request_id: 'revision-record', status: 'returned_for_revision', delivery_status: 'assigned' },
  { request_id: 'completed-record', status: 'approved', delivery_status: 'delivered' },
  { request_id: 'failed-record', status: '', delivery_status: 'failed' },
  { request_id: 'cancelled-record', status: 'cancelled', delivery_status: 'failed' },
  { request_id: 'declined-record', status: 'disapproved', delivery_status: 'pending' },
  { request_id: 'unknown-record', status: 'unknown' },
];
beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('summary-stats')
    ? { requests, counts: buildRequestAccounting(requests) } : [] }));
});
afterEach(cleanup);

describe('Main Stats reconciled ledger', () => {
  it('shows an exhaustive balance and lets admins trace cancelled, declined, revision and unknown records', async () => {
    render(<AnalyticsHub />);
    const reconciliation = await screen.findByRole('region', { name: 'Request reconciliation' });
    expect(reconciliation.textContent).toContain('Total requests: 8');
    expect(reconciliation.textContent).toContain('Difference: 0');
    const expand = within(reconciliation).getByRole('button', { name: 'View breakdown' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(within(reconciliation).queryByRole('button', { name: 'Cancelled: 1' })).toBeNull();
    fireEvent.click(expand);
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    for (const [category, id] of [['Cancelled', 'cancelled-record'], ['Declined', 'declined-record'], ['For revision', 'revision-record'], ['Unclassified', 'unknown-record']]) {
      fireEvent.click(within(reconciliation).getByRole('button', { name: `${category}: 1` }));
      expect(within(table).getAllByRole('row')).toHaveLength(2);
      expect(table.textContent).toContain(id);
    }
    fireEvent.click(within(reconciliation).getByRole('button', { name: 'Total requests: 8' }));
    expect(within(table).getAllByRole('row')).toHaveLength(9);
  });

  it('offers the all-date balance only in Analytics and requests the full reporting scope', async () => {
    const allRecords = Array.from({ length: 159 }, (_, i) => ({ request_id: `all-${i}`, status: 'approved', delivery_status: 'completed' }));
    fetchWithAuth.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('summary-stats')
      ? { requests: url.includes('scope=all') ? allRecords : requests, counts: buildRequestAccounting(url.includes('scope=all') ? allRecords : requests) } : [] }));
    render(<AnalyticsHub />);
    await screen.findByRole('region', { name: 'Request reconciliation' });
    fireEvent.click(screen.getByRole('button', { name: 'All dates' }));
    const reconciliation = await screen.findByRole('region', { name: 'Request reconciliation' });
    expect(reconciliation.textContent).toContain('Total requests: 159');
    expect(reconciliation.textContent).toContain('All creation dates');
    expect(fetchWithAuth.mock.calls.some(([url]) => String(url).includes('summary-stats?scope=all'))).toBe(true);
  });

  it('rejects mismatched counters instead of claiming the data balances', async () => {
    fetchWithAuth.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('summary-stats')
      ? { requests, counts: { ...buildRequestAccounting(requests), total: 100 } } : [] }));
    render(<AnalyticsHub />);
    expect(await screen.findByText('Unable to reconcile Main Stats. Please retry.')).toBeDefined();
    expect(screen.queryByRole('region', { name: 'Request reconciliation' })).toBeNull();
  });
});
