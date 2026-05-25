import { getRiderTaskCounts, getRiderTaskTab } from '../taskFilters';
import { Job } from '@/types';

const makeJob = (overrides: Partial<Job>): Job => ({
  request_id: 'req_test',
  requester_name: 'Requester',
  delivery_date: '2026-05-25',
  time_window: '09:00 - 10:00',
  pickup_location: { lat: 0, lng: 0, address: 'Pickup' },
  dropoff_location: { lat: 0, lng: 0, address: 'Dropoff' },
  recipient_name: 'Recipient',
  recipient_contact: '09000000000',
  urgency_level: 'Medium',
  status: 'approved',
  delivery_status: 'assigned',
  assigned_rider_id: 'rider_001',
  request_type: 'Delivery/Pickup',
  ...overrides,
});

describe('taskFilters', () => {
  const today = new Date(2026, 4, 25, 8, 30);

  it('classifies active approved jobs into rider tabs by local calendar date', () => {
    expect(getRiderTaskTab(makeJob({ delivery_date: '2026-05-24' }), today)).toBe('overdue');
    expect(getRiderTaskTab(makeJob({ delivery_date: '2026-05-25' }), today)).toBe('today');
    expect(getRiderTaskTab(makeJob({ delivery_date: '2026-05-26' }), today)).toBe('tomorrow');
  });

  it('moves same-day jobs past their time window to overdue', () => {
    expect(getRiderTaskTab(makeJob({
      delivery_date: '2026-05-25',
      time_window: '07:00 - 08:00',
    }), today)).toBe('overdue');
  });

  it('hides unapproved and terminal jobs from active rider tabs', () => {
    expect(getRiderTaskTab(makeJob({ status: 'pending' }), today)).toBe('hidden');
    expect(getRiderTaskTab(makeJob({ delivery_status: 'completed' }), today)).toBe('hidden');
  });

  it('uses the same classification for badge counts', () => {
    const counts = getRiderTaskCounts([
      makeJob({ request_id: 'overdue', delivery_date: '2026-05-24' }),
      makeJob({ request_id: 'today', delivery_date: '2026-05-25', time_window: '09:00 - 10:00' }),
      makeJob({ request_id: 'tomorrow', delivery_date: '2026-05-26' }),
      makeJob({ request_id: 'done', delivery_date: '2026-05-25', delivery_status: 'completed' }),
    ], today);

    expect(counts).toEqual({ today: 1, overdue: 1 });
  });
});
