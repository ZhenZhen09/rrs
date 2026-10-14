// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestCard } from '../../../components/Admin/Dispatch/RequestCard';
import { RequestList } from '../../../components/Admin/Dispatch/RequestList';
import type { DeliveryRequest } from '../../../types';
import { compareRiderQueue } from '../../../utils/dispatchQueue';

const task = (request_id: string, rider: string, queue_order: number) => ({
  request_id,
  assigned_rider_id: rider,
  assigned_rider_name: rider === 'rider-a' ? 'Riley Rider' : 'Morgan Rider',
  queue_order,
  delivery_date: '2026-10-08',
  created_at: '2026-10-01T09:00:00Z',
  status: 'approved',
  delivery_status: 'assigned',
  pickup_location: { address: 'Pickup' },
  dropoff_location: { address: 'Dropoff', businessName: 'Building' },
  requester_name: 'Requester',
  urgency_level: 'Medium',
} as unknown as DeliveryRequest);

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });

describe('Active and Overdue rider queue order', () => {
  it.each(['active', 'overdue'])('%s sequence sorts by rider and then queue rank', () => {
    const tasks = [task('a-2', 'rider-a', 2), task('b-1', 'rider-b', 1), task('a-1', 'rider-a', 1)];
    expect(tasks.sort(compareRiderQueue).map((request) => request.request_id)).toEqual(['a-1', 'a-2', 'b-1']);
  });

  it.each(['active', 'overdue'] as const)('%s exposes the selected Rider Queue sort option', async (filter) => {
    render(<RequestList requests={[]} selectedId={null} onSelect={() => undefined} filter={filter}
      sortBy="sequence" onSortChange={() => undefined} counts={{ pending: 0, active: 0, done: 0, overdue: 0 }} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: 'Rider Queue' })).toBeTruthy();
    cleanup();
  });

  it('labels each visible rank with its rider scope', () => {
    render(<RequestCard request={task('a-1', 'rider-a', 1)} isSelected={false} onClick={() => undefined} isActiveTab />);
    expect(screen.getByLabelText('Queue position 1 for Riley Rider')).toBeTruthy();
    expect(screen.getByText('Riley')).toBeTruthy();
  });
});
