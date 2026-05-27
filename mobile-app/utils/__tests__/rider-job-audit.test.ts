import { getRiderTaskTab } from '../taskFilters';
import { Job } from '@/types';

describe('Rider Job Audit: Transaction #68199574', () => {
  const targetJob: Job = {
    request_id: 'req_1779768199574',
    status: 'approved',
    delivery_status: 'assigned',
    delivery_date: '2026-05-28',
    time_window: '11:00 - 11:30',
    pickup_location: { lat: 1, lng: 1, address: 'A' },
    dropoff_location: { lat: 1, lng: 1, address: 'B' },
    recipient_name: 'Recipient',
    request_type: 'Delivery',
    urgency_level: 'Normal',
    requester_id: 'user_1',
    created_at: '2026-05-26T00:00:00Z'
  };

  it('Audit: Where does it land if Today is May 26?', () => {
    const today = new Date('2026-05-26T12:00:00'); // Noon
    const tab = getRiderTaskTab(targetJob, today);
    console.log(`Audit Results (Today=May 26): Job is in [${tab}] tab`);
    expect(tab).toBe('future');
  });

  it('Audit: Where does it land if Today is May 27?', () => {
    const today = new Date('2026-05-27T12:00:00'); // Noon
    const tab = getRiderTaskTab(targetJob, today);
    console.log(`Audit Results (Today=May 27): Job is in [${tab}] tab`);
    expect(tab).toBe('tomorrow');
  });

  it('Audit: Where does it land if Today is May 28 (Before Window)?', () => {
    const today = new Date('2026-05-28T10:00:00'); // 10 AM (Window starts at 11:00)
    const tab = getRiderTaskTab(targetJob, today);
    console.log(`Audit Results (Today=May 28, 10AM): Job is in [${tab}] tab`);
    expect(tab).toBe('today');
  });

  it('Audit: Where does it land if Today is May 28 (After Window)?', () => {
    const today = new Date('2026-05-28T12:00:00'); // 12 PM (Window ended at 11:30)
    const tab = getRiderTaskTab(targetJob, today);
    console.log(`Audit Results (Today=May 28, 12PM): Job is in [${tab}] tab`);
    expect(tab).toBe('overdue');
  });

  it('Audit: Where does it land if Today is May 29?', () => {
    const today = new Date('2026-05-29T12:00:00'); // Noon
    const tab = getRiderTaskTab(targetJob, today);
    console.log(`Audit Results (Today=May 29): Job is in [${tab}] tab`);
    expect(tab).toBe('overdue');
  });
});
