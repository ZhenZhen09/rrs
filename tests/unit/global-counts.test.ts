import { describe, it, expect } from 'vitest';
import { 
  getGroupedStatus, 
  isTerminalRequest, 
  isActiveRequest, 
  isPendingRequest 
} from '../../src/app/utils/statusMapping';

describe('Request Status Grouping Logic', () => {
  describe('Pending Categorization', () => {
    it('should identify basic pending as pending', () => {
      const req = { status: 'pending' };
      expect(isPendingRequest(req)).toBe(true);
    });

    it('should NOT identify returned_for_revision as pending anymore', () => {
      const req = { status: 'returned_for_revision' };
      expect(isPendingRequest(req)).toBe(false);
    });

    it('should NOT identify resubmitted (pending_review) as pending', () => {
      const req = { status: 'pending', delivery_status: 'pending_review' };
      expect(isPendingRequest(req)).toBe(false);
    });
  });

  describe('Active Categorization', () => {
    it('should identify approved but unassigned as active', () => {
      const req = { status: 'approved', delivery_status: 'pending' };
      expect(isActiveRequest(req)).toBe(true);
    });

    it('should identify resubmitted (pending_review) as active', () => {
      const req = { status: 'pending', delivery_status: 'pending_review' };
      expect(isActiveRequest(req)).toBe(true);
    });
  });

  describe('Terminal (Done) Categorization', () => {
    it('should identify completed as terminal', () => {
      const req = { status: 'approved', delivery_status: 'completed' };
      expect(isTerminalRequest(req)).toBe(true);
    });

    it('should identify failed as terminal', () => {
      const req = { status: 'approved', delivery_status: 'failed' };
      expect(isTerminalRequest(req)).toBe(true);
    });
  });
});
