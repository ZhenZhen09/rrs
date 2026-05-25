import { getRiderTaskTab, TERMINAL_DELIVERY_STATUSES } from '../taskFilters';
import { Job } from '@/types';

describe('Enterprise Business Rules: Task Filtering', () => {
  const mockJob: Job = {
    request_id: 'test_123',
    status: 'approved',
    delivery_status: 'assigned',
    delivery_date: '2026-05-25',
    time_window: '09:00 - 10:00',
    pickup_location: { lat: 14, lng: 121, address: 'A' },
    dropoff_location: { lat: 14.1, lng: 121.1, address: 'B' },
    recipient_name: 'User',
    request_type: 'Delivery',
    urgency_level: 'Normal',
    requester_id: 'req_1',
    created_at: '2026-05-25T00:00:00Z'
  };

  it('✅ PASS: Categorizes assigned job for today as "today" if window is future', () => {
    // Set 'today' context to 8:00 AM so the 09:00-10:00 window is still in the future
    const morningContext = new Date('2026-05-25T08:00:00');
    const result = getRiderTaskTab(mockJob, morningContext);
    expect(result).toBe('today');
  });

  it('✅ PASS: Categorizes today job as "overdue" if window is passed', () => {
    // Set 'today' context to 11:00 AM so the 09:00-10:00 window is passed
    const lateContext = new Date('2026-05-25T11:00:00');
    const result = getRiderTaskTab(mockJob, lateContext);
    expect(result).toBe('overdue');
  });

  it('✅ PASS: Categorizes assigned job for yesterday as "overdue"', () => {
    const result = getRiderTaskTab(mockJob, '2026-05-26');
    expect(result).toBe('overdue');
  });

  it('✅ PASS: Categorizes assigned job for tomorrow as "tomorrow"', () => {
    const result = getRiderTaskTab(mockJob, '2026-05-24');
    expect(result).toBe('tomorrow');
  });

  it('✅ PASS: Hides completed jobs from active tabs', () => {
    TERMINAL_DELIVERY_STATUSES.forEach(status => {
      const job = { ...mockJob, delivery_status: status as any };
      const result = getRiderTaskTab(job, '2026-05-25');
      expect(result).toBe('hidden');
    });
  });

  it('⚠️ EDGE CASE: Correctly identifies "future" jobs beyond tomorrow', () => {
    const result = getRiderTaskTab(mockJob, '2026-05-20');
    expect(result).toBe('future');
  });
});
