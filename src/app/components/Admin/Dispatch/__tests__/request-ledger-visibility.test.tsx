// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RequestList } from '../RequestList';
import type { DeliveryRequest } from '../../../../types';
vi.mock('../RequestCard', () => ({ RequestCard: ({ request }: { request: DeliveryRequest }) => <div>{request.request_id}</div> }));
afterEach(cleanup);
describe('Dispatch ledger visibility', () => {
  it('renders icon and count tabs with labels and preserves the selected filter', () => {
    const onFilterChange = vi.fn();
    render(
      <RequestList
        requests={[]}
        filter="pending"
        counts={{ total: 12, pending: 3, active: 4, overdue: 2, done: 5 }}
        selectedId={null}
        onSelect={() => {}}
        onFilterChange={onFilterChange}
        sortBy="day-of-week"
        onSortChange={() => {}}
      />,
    );

    for (const [name, label] of [
      ['All, 12 requests', 'All'],
      ['Pending, 3 requests', 'Pending'],
      ['Active, 4 requests', 'Active'],
      ['Overdue, 2 requests', 'Overdue'],
      ['Done, 5 requests', 'Done'],
    ]) {
      expect(screen.getByRole('tab', { name }).querySelector('svg')).not.toBeNull();
      expect(screen.getByText(label, { exact: true }).className).toContain('text-[8px]');
    }

    expect(screen.getByRole('tab', { name: 'Pending, 3 requests' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Overdue, 2 requests' }));
    expect(onFilterChange).toHaveBeenCalledWith('overdue');
  });

  it('retains missing and invalid schedule dates and does not label past pending requests as overdue', () => {
    const requests = [
      { request_id: 'no-date', status: 'pending' },
      { request_id: 'bad-date', status: 'pending', delivery_date: 'not-a-date' },
      { request_id: 'past-pending', status: 'pending', delivery_date: '2020-01-01', is_overdue: false },
    ] as DeliveryRequest[];
    render(<RequestList requests={requests} filter="all" selectedId={null} onSelect={() => {}} sortBy="day-of-week" onSortChange={() => {}} />);
    for (const request of requests) expect(screen.getByText(request.request_id)).toBeDefined();
    expect(screen.getByText('Other')).toBeDefined();
    expect(screen.queryByText('OVERDUE')).toBeNull();
  });
});
