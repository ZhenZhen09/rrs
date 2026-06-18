import { describe, it, expect } from 'vitest';
import { isTerminalRequest, isActiveRequest, isPendingRequest } from '../statusMapping';

describe('Enterprise Status Mapping Audit', () => {
  
  describe('isPendingRequest', () => {
    it('✅ PASS: Identifies "pending" status', () => {
      expect(isPendingRequest({ status: 'pending' })).toBe(true);
    });

    it('🛑 NEW BEHAVIOR: "returned_for_revision" is no longer grouped as pending', () => {
      expect(isPendingRequest({ status: 'returned_for_revision' })).toBe(false);
    });

    it('🛑 NEW BEHAVIOR: "pending_review" resubmissions are not in pending tab', () => {
      expect(isPendingRequest({ status: 'pending', delivery_status: 'pending_review' })).toBe(false);
    });

    it('🛑 NEGATIVE: Rejects other statuses', () => {
      expect(isPendingRequest({ status: 'approved' })).toBe(false);
      expect(isPendingRequest({ status: 'cancelled' })).toBe(false);
    });
  });

  describe('isActiveRequest', () => {
    it('✅ PASS: Identifies an approved, non-terminal task as Active', () => {
      const job = { status: 'approved', delivery_status: 'assigned' };
      expect(isActiveRequest(job)).toBe(true);
    });

    it('✅ NEW BEHAVIOR: Identifies resubmissions (pending_review) as Active', () => {
      const job = { status: 'pending', delivery_status: 'pending_review' };
      expect(isActiveRequest(job)).toBe(true);
    });

    it('🛑 BUG FIX: Correctly identifies "delivered" as NOT active', () => {
      const job = { status: 'approved', delivery_status: 'delivered' };
      expect(isActiveRequest(job)).toBe(false);
    });

    it('🛑 NEGATIVE: Rejects non-approved tasks', () => {
      expect(isActiveRequest({ status: 'pending' })).toBe(false);
    });
  });

  describe('isTerminalRequest', () => {
    it('✅ PASS: Identifies "completed" as terminal', () => {
      expect(isTerminalRequest({ status: 'approved', delivery_status: 'completed' })).toBe(true);
    });

    it('✅ PASS: Identifies "delivered" as terminal', () => {
      expect(isTerminalRequest({ status: 'approved', delivery_status: 'delivered' })).toBe(true);
    });

    it('✅ PASS: Identifies "cancelled" as terminal', () => {
      expect(isTerminalRequest({ status: 'cancelled' })).toBe(true);
    });

    it('✅ PASS: Identifies "disapproved" as terminal', () => {
      expect(isTerminalRequest({ status: 'disapproved' })).toBe(true);
    });
  });
});
