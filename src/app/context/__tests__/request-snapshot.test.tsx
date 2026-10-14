// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';
const { user, logout } = vi.hoisted(() => ({ user: { id: 'admin-test', role: 'admin' }, logout: vi.fn() }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ user, logout }) }));
vi.mock('../RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
const fetchMock = vi.fn();
const records = Array.from({ length: 159 }, (_, i) => ({ request_id: `record-${i}`, status: 'pending' }));
function View() {
  const data = useData();
  return <><output>{data.requestsLoading ? 'Loading' : `${data.requests.length} records`}</output>
    {data.requestsError && <p role="alert">{data.requestsError}</p>}
    <button onClick={() => void data.refreshData()}>Refresh</button></>;
}
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/requests?')
    ? { data: records, meta: { total: 159 } } : [] }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('admin full request snapshot', () => {
  it.each([records.slice(0, 100), { data: records.slice(0, 100) }])('rejects snapshots without proof of completeness', async payload => {
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/requests?') ? payload : [] }));
    render(<DataProvider><View /></DataProvider>);
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to verify all requests');
  });
  it('requests and displays all 159 records, not the first 100', async () => {
    render(<DataProvider><View /></DataProvider>);
    await screen.findByText('159 records');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/requests?limit=100&all=true'))).toBe(true);
  });
  it('retains the last ledger and reports a truncated refresh instead of accepting partial data', async () => {
    render(<DataProvider><View /></DataProvider>);
    await screen.findByText('159 records');
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/requests?')
      ? { data: records.slice(0, 100), meta: { total: 159 } } : [] }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to verify all requests');
    expect(screen.getByText('159 records')).toBeDefined();
  });
});
