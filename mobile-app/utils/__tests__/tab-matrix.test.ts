import { getRiderTaskTab, TERMINAL_DELIVERY_STATUSES } from '../taskFilters';
import { Job } from '@/types';

describe('Intensive Date & Status Audit: Rider App Matrix', () => {
  const mockBaseJob: Job = {
    request_id: 'test-job',
    status: 'approved',
    delivery_status: 'assigned',
    delivery_date: '2026-05-25',
    time_window: '09:00 - 12:00',
    pickup_location: { lat: 1, lng: 1, address: 'A' },
    dropoff_location: { lat: 1, lng: 1, address: 'B' },
    recipient_name: 'Recipient',
    request_type: 'Delivery',
    urgency_level: 'Normal',
    requester_id: 'user_1',
    created_at: '2026-05-25T00:00:00Z'
  };

  // Using May 25, 2026, 12:00 PM as our "Artificial Today" for testing
  const artificialToday = new Date('2026-05-25T12:00:00');

  describe('Status Isolation', () => {
    it('should HIDE jobs with "pending" status regardless of date', () => {
      const job = { ...mockBaseJob, status: 'pending' as any };
      expect(getRiderTaskTab(job, artificialToday)).toBe('hidden');
    });

    it('should HIDE jobs with terminal status regardless of date', () => {
      TERMINAL_DELIVERY_STATUSES.forEach(status => {
        const job = { ...mockBaseJob, delivery_status: status as any };
        expect(getRiderTaskTab(job, artificialToday)).toBe('hidden');
      });
    });
  });

  describe('Date Transitions', () => {
    it('should categorize Yesterday (May 24) as OVERDUE', () => {
      const job = { ...mockBaseJob, delivery_date: '2026-05-24' };
      expect(getRiderTaskTab(job, artificialToday)).toBe('overdue');
    });

    it('should categorize Today (Future Window 13:00) as TODAY', () => {
      const job = { ...mockBaseJob, delivery_date: '2026-05-25', time_window: '13:00 - 15:00' };
      expect(getRiderTaskTab(job, artificialToday)).toBe('today');
    });

    it('should categorize Today (Passed Window 08:00) as OVERDUE', () => {
      const job = { ...mockBaseJob, delivery_date: '2026-05-25', time_window: '08:00 - 10:00' };
      expect(getRiderTaskTab(job, artificialToday)).toBe('overdue');
    });

    it('should categorize Tomorrow (May 26) as TOMORROW', () => {
      const job = { ...mockBaseJob, delivery_date: '2026-05-26' };
      expect(getRiderTaskTab(job, artificialToday)).toBe('tomorrow');
    });

    it('should categorize Next Week (June 1) as FUTURE', () => {
      const job = { ...mockBaseJob, delivery_date: '2026-06-01' };
      expect(getRiderTaskTab(job, artificialToday)).toBe('future');
    });
  });
});
