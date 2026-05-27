import { getRiderTaskTab } from '../taskFilters';
import { Job } from '@/types';

describe('Rider Mobile App: Midnight & Scheduling Audit', () => {
  const jobAtMidnight: Job = {
    request_id: 'req_midnight',
    status: 'approved',
    delivery_status: 'assigned',
    delivery_date: '2026-05-28',
    time_window: '00:00 - 00:30',
    pickup_location: { lat: 1, lng: 1, address: 'A' },
    dropoff_location: { lat: 1, lng: 1, address: 'B' },
    recipient_name: 'Test',
    request_type: 'Delivery',
    urgency_level: 'Normal',
    requester_id: 'user_1',
    created_at: '2026-05-26T00:00:00Z'
  };

  it('🛑 Edge Case: 1 minute before midnight (May 27, 11:59 PM)', () => {
    // Current time is Wednesday night
    const now = new Date('2026-05-27T23:59:00');
    const tab = getRiderTaskTab(jobAtMidnight, now);
    
    // It should be in the "Tomorrow" tab because May 28 is tomorrow.
    expect(tab).toBe('tomorrow');
  });

  it('🛑 Edge Case: Exactly at midnight (May 28, 12:00 AM)', () => {
    // Current time is Thursday morning
    const now = new Date('2026-05-28T00:00:00');
    const tab = getRiderTaskTab(jobAtMidnight, now);
    
    // It should move to "Today" immediately.
    expect(tab).toBe('today');
  });

  it('🛑 Logic Check: Overdue after midnight (May 29, 12:00 AM)', () => {
    const now = new Date('2026-05-29T00:00:00');
    const tab = getRiderTaskTab(jobAtMidnight, now);
    
    expect(tab).toBe('overdue');
  });

  it('✅ Logic Check: Future jobs (May 26)', () => {
    const now = new Date('2026-05-26T12:00:00');
    const tab = getRiderTaskTab(jobAtMidnight, now);
    
    expect(tab).toBe('future');
  });
});
