// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataProvider, useData } from '../DataContext';

const { authState, socket, socketHandlers } = vi.hoisted(() => {
  const handlers = new Map<string, (data?: any) => void>();
  const realtimeSocket = { on: (event: string, handler: (data?: any) => void) => handlers.set(event, handler), off: vi.fn() };
  return { authState: { user: { id: 'admin-1', role: 'admin' }, logout: vi.fn() }, socket: realtimeSocket, socketHandlers: handlers };
});
vi.mock('../AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../RealTimeContext', () => ({ useRealTime: () => ({ socket }) }));

const fetchMock = vi.fn();
let requestRecords: Array<Record<string, unknown>>;
function ApprovalView() {
  const { requests, approveRequest } = useData();
  const [error, setError] = React.useState('');
  return <>
    <output>{requests.map(({ request_id, status }) => `${request_id}:${status}`).join(',') || 'empty'}</output>
    {error && <p role="alert">{error}</p>}
    <button onClick={() => void approveRequest('request-1', 'rider-1').catch(() => setError('approval rejected'))}>Approve</button>
  </>;
}

import React from 'react';

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  requestRecords = [{ request_id: 'request-1', status: 'pending' }];
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes('/requests?')) return { ok: true, json: async () => ({ data: requestRecords, meta: { total: requestRecords.length } }) };
    if (url.endsWith('/requests/request-1/approve')) return { ok: false, status: 409, json: async () => ({ error: 'Conflict' }) };
    return { ok: true, json: async () => [] };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('approveRequest failure behavior', () => {
  it('rejects to the caller and restores the optimistic request state', async () => {
    render(<DataProvider><ApprovalView /></DataProvider>);
    await screen.findByText('request-1:pending');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByText('request-1:pending')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toBe('approval rejected');
  });

  it('preserves another request’s socket update when approval fails', async () => {
    let rejectApproval!: (response: { ok: boolean; status: number; json: () => Promise<unknown> }) => void;
    requestRecords = [
      { request_id: 'request-1', status: 'pending' },
      { request_id: 'request-2', status: 'pending' },
    ];
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/requests?')) return Promise.resolve({ ok: true, json: async () => ({ data: requestRecords, meta: { total: requestRecords.length } }) });
      if (url.endsWith('/requests/request-1/approve')) return new Promise((resolve) => { rejectApproval = resolve; });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    render(<DataProvider><ApprovalView /></DataProvider>);
    await screen.findByText('request-1:pending,request-2:pending');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(rejectApproval).toBeDefined());

    requestRecords = [
      { request_id: 'request-1', status: 'pending' },
      { request_id: 'request-2', status: 'approved', delivery_status: 'assigned' },
    ];
    socketHandlers.get('request-updated')?.({ request_id: 'request-2', status: 'approved', delivery_status: 'assigned' });
    await screen.findByText('request-1:approved,request-2:approved');
    rejectApproval({ ok: false, status: 409, json: async () => ({ error: 'Conflict' }) });

    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByText('request-1:pending,request-2:approved')).toBeTruthy());
  });

  it('refreshes the request snapshot when the server broadcasts a queue update', async () => {
    render(<DataProvider><ApprovalView /></DataProvider>);
    await screen.findByText('request-1:pending');
    requestRecords = [{ request_id: 'request-1', status: 'approved', delivery_status: 'assigned' }];
    socketHandlers.get('requests-updated')?.();
    await screen.findByText('request-1:approved');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/requests?'))).toHaveLength(2);
  });
});
