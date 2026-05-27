import { getLocalDateStr, parseLocalDate } from '../dateUtils';
import { getRiderTaskTab } from '../taskFilters';
import { Job } from '@/types';

describe('Intensive Audit: Data Boundaries & Type Safety', () => {

  describe('getLocalDateStr / parseLocalDate', () => {
    it('🛑 NEGATIVE: Should handle null/undefined without crashing', () => {
      // @ts-ignore
      expect(getLocalDateStr(null)).toBe('');
      // @ts-ignore
      expect(getLocalDateStr(undefined)).toBeDefined();
    });

    it('🛑 NEGATIVE: Should handle invalid date strings gracefully', () => {
      const invalid = "NOT-A-DATE";
      expect(getLocalDateStr(invalid)).toBe(''); // Should return empty on malformed string
      expect(parseLocalDate(invalid).getTime()).toBeNaN;
    });

    it('🛑 NEGATIVE: Should handle empty strings', () => {
      expect(getLocalDateStr('')).toBe('');
      const parsed = parseLocalDate('');
      // Expect it to return current date as fallback per code
      expect(parsed).toBeInstanceOf(Date);
    });
  });

  describe('getRiderTaskTab', () => {
    const mockFullJob: Job = {
      request_id: '1',
      status: 'approved',
      delivery_status: 'assigned',
      delivery_date: '2026-05-25',
      time_window: '09:00 - 10:00',
      pickup_location: { lat: 1, lng: 1, address: 'X' },
      dropoff_location: { lat: 1, lng: 1, address: 'Y' },
      recipient_name: 'U',
      request_type: 'D',
      urgency_level: 'Normal',
      requester_id: 'R',
      created_at: '2026-05-25T00:00:00Z'
    };

    it('🛑 NEGATIVE: Should return "hidden" if job object is empty/malformed', () => {
      // @ts-ignore
      expect(getRiderTaskTab({})).toBe('hidden');
    });

    it('🛑 NEGATIVE: Should handle missing delivery_status', () => {
      // @ts-ignore
      const brokenJob = { ...mockFullJob, delivery_status: undefined };
      expect(getRiderTaskTab(brokenJob)).toBe('hidden');
    });

    it('🛑 NEGATIVE: Should handle missing status', () => {
       // @ts-ignore
       const brokenJob = { ...mockFullJob, status: null };
       expect(getRiderTaskTab(brokenJob)).toBe('hidden');
    });
  });
});
