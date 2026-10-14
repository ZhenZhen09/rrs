// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestDetailsPanel } from '../RequestDetailsPanel';
import type { DeliveryRequest, User } from '../../../../types';
import type { RiderAvailabilityInput } from '../../../../utils/riderAvailability';

vi.mock('../../../../context/DataContext', () => ({ useData: () => ({ updateDeliveryStatus: vi.fn(), returnForRevision: vi.fn() }) }));
vi.mock('../DispatchMapView', () => ({ DispatchMapView: () => null }));
vi.mock('../RiderSelectionList', () => ({
  RiderSelectionList: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('rider-1')}>Choose rider</button>
  ),
}));
vi.mock('../TimelineComponent', () => ({ TimelineComponent: () => null }));
vi.mock('../../../../pages/LiveTrackingDashboard', () => ({ LiveTrackingDashboard: () => null }));

afterEach(() => cleanup());

const today = new Date().toISOString().slice(0, 10);
const request = {
  request_id: 'request-1', status: 'pending', delivery_status: 'pending', delivery_date: today,
  time_window: '09:00 - 10:00', created_at: `${today} 08:00:00`, requester_name: 'Requester',
  recipient_name: 'Recipient', request_type: 'Delivery', urgency_level: 'Medium', requester_id: 'requester-1',
  pickup_location: { lat: 14, lng: 121, address: 'Pickup' }, dropoff_location: { lat: 14, lng: 121, address: 'Dropoff' },
} as DeliveryRequest;

const onlineRider = { id: 'rider-1', name: 'Rider One', email: 'rider@example.com', role: 'rider', is_on_duty: true,
  is_online: true, attendance_status: null } as User & RiderAvailabilityInput;

describe('RequestDetailsPanel assignment eligibility', () => {
  it('does not submit a same-day rider who goes offline after selection', () => {
    const onApprove = vi.fn();
    const { rerender } = render(<MemoryRouter><RequestDetailsPanel request={request} riders={[onlineRider]} activeRequests={[]}
      onApprove={onApprove} onDecline={vi.fn()} isSubmitting={false} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Choose rider' }));

    rerender(<MemoryRouter><RequestDetailsPanel request={request} riders={[{ ...onlineRider, is_online: false } as User & RiderAvailabilityInput]}
      activeRequests={[]} onApprove={onApprove} onDecline={vi.fn()} isSubmitting={false} /></MemoryRouter>);

    const assign = screen.getByRole('button', { name: /Assign to Rider/i });
    expect(assign.hasAttribute('disabled')).toBe(true);
    fireEvent.click(assign);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('allows an online on-duty rider without a report to be assigned today', () => {
    const onApprove = vi.fn();
    render(<MemoryRouter><RequestDetailsPanel request={request} riders={[onlineRider]} activeRequests={[]}
      onApprove={onApprove} onDecline={vi.fn()} isSubmitting={false} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Choose rider' }));
    fireEvent.click(screen.getByRole('button', { name: /Assign to Rider/i }));
    expect(onApprove).toHaveBeenCalledWith('rider-1', '');
  });
});
