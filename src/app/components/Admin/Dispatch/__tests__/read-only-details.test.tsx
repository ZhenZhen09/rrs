// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { RequestDetailsPanel } from '../RequestDetailsPanel';
import type { DeliveryRequest } from '../../../../types';
vi.mock('../../../../context/DataContext', () => ({ useData: () => ({ updateDeliveryStatus: vi.fn(), returnForRevision: vi.fn() }) }));
vi.mock('../DispatchMapView', () => ({ DispatchMapView: () => null }));
vi.mock('../RiderSelectionList', () => ({ RiderSelectionList: () => null }));
vi.mock('../TimelineComponent', () => ({ TimelineComponent: () => null }));
vi.mock('../../../../pages/LiveTrackingDashboard', () => ({ LiveTrackingDashboard: () => null }));
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => [] })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const request = { request_id: 'terminal-request', status: 'approved', delivery_date: '2026-10-04',
  created_at: '2026-10-04 08:00:00', time_window: '08:00 - 09:00',
  requester_name: 'Requester', recipient_name: 'Recipient', assigned_rider_id: 'rider-1', assigned_rider_name: 'Rider',
  request_type: 'Delivery', urgency_level: 'Medium', requester_id: 'personnel-1',
  pickup_location: { lat: 14, lng: 121, address: 'Pickup' }, dropoff_location: { lat: 14, lng: 121, address: 'Dropoff' },
} as DeliveryRequest;
describe('Dispatch details interactions', () => {
  it.each(['delivered', 'cancelled'])('does not expose route mutation for %s records', delivery_status => {
    render(<MemoryRouter><RequestDetailsPanel request={{ ...request, delivery_status: delivery_status as DeliveryRequest['delivery_status'] }}
      riders={[]} activeRequests={[]} onApprove={() => {}} onDecline={() => {}} onManageRoute={() => {}} isSubmitting={false} readOnly /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Manage Route/i })).toBeNull();
  });

  it('keeps the active-task confirmation description free of interactive block content', () => {
    render(<MemoryRouter><RequestDetailsPanel request={{ ...request, delivery_status: 'in_progress' }}
      riders={[]} activeRequests={[]} onApprove={() => {}} onDecline={() => {}} isSubmitting={false} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    const dialog = screen.getByRole('alertdialog');
    const description = dialog.querySelector('[data-slot="alert-dialog-description"]');
    expect(description).not.toBeNull();
    expect(description?.querySelector('p')).toBeNull();
    expect(description?.querySelector('div, textarea, label')).toBeNull();
    expect(screen.getByPlaceholderText('Explain why this transaction is being closed...')).toBeTruthy();
    expect(screen.getByText('Common Reasons')).toBeTruthy();

    const reason = screen.getByRole('button', { name: 'Rider forgot to click complete' });
    expect(reason.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(reason);
    expect(reason.getAttribute('aria-pressed')).toBe('true');
  });

  it('layers the status confirmation above the full-screen mobile details dialog', () => {
    render(<MemoryRouter>
      <Dialog open>
        <DialogContent>
          <DialogTitle>Mobile dispatch details host</DialogTitle>
          <DialogDescription>Test parent dialog for mobile dispatch.</DialogDescription>
          <RequestDetailsPanel request={{ ...request, delivery_status: 'in_progress' }}
            riders={[]} activeRequests={[]} onApprove={() => {}} onDecline={() => {}} isSubmitting={false} />
        </DialogContent>
      </Dialog>
    </MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    const parentDialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    const confirmation = screen.getByRole('alertdialog');
    const alertOverlay = document.querySelector<HTMLElement>('[data-slot="alert-dialog-overlay"]');
    const zIndexOf = (element: HTMLElement) => {
      const match = element.className.match(/(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?:$|\s)/);
      return Number(match?.[1] ?? match?.[2] ?? 0);
    };

    expect(alertOverlay).not.toBeNull();
    expect(zIndexOf(alertOverlay!)).toBeGreaterThan(zIndexOf(parentDialog));
    expect(zIndexOf(confirmation)).toBeGreaterThan(zIndexOf(parentDialog));
  });
});
