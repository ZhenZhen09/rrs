import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RequestCard } from '../../src/app/components/Admin/Dispatch/RequestCard';
import type { DeliveryRequest } from '../../src/app/types';

const request: DeliveryRequest = {
  request_id: 'request-1', requester_id: 'personnel-1', created_at: '2026-10-04T00:00:00Z',
  delivery_date: '2026-10-04', time_window: '08:00 - 09:00',
  pickup_location: { lat: 14, lng: 121, address: 'Pickup' },
  dropoff_location: { lat: 14.1, lng: 121.1, address: 'Dropoff' },
  recipient_name: 'Recipient', request_type: 'Delivery', urgency_level: 'Medium', status: 'pending',
};

describe('request cards with missing optional metadata', () => {
  it('labels cancellation, revision and unknown records consistently with the accounting ledger', () => {
    for (const [status, label] of [['cancelled', 'CANCELLED'], ['returned_for_revision', 'FOR REVISION'], ['custom', 'UNCLASSIFIED']]) {
      const html = renderToStaticMarkup(<RequestCard request={{ ...request, status: status as DeliveryRequest['status'] }} isSelected={false} onClick={() => {}} />);
      expect(html).toContain(label);
    }
  });
  it('renders a request without a requester name', () => {
    const html = renderToStaticMarkup(<RequestCard request={request} isSelected={false} onClick={() => {}} />);
    expect(html).toContain('UNKNOWN REQUESTER');
    expect(html).toContain('Recipient');
  });

  it('renders an on-behalf-of name without trying to split a missing requester name', () => {
    const html = renderToStaticMarkup(<RequestCard request={{ ...request, on_behalf_of: 'Finance' }} isSelected={false} onClick={() => {}} />);
    expect(html).toContain('FINANCE');
    expect(html).not.toContain('(undefined)');
  });
});
