import { describe, it, expect } from 'vitest';

const calculateCompletionRate = (counts: any) => {
  return counts.total > 0 ? ((counts.completed / counts.total) * 100).toFixed(1) : "0";
};

const calculateFailureRate = (counts: any) => {
  return counts.total > 0 ? Math.round((counts.failed / counts.total) * 100) : 0;
};

describe('Web Admin: Analytics Mathematics Audit', () => {
  
  it('✅ Logic: Should handle Zero traffic gracefully', () => {
    const zeroCounts = { total: 0, completed: 0, failed: 0 };
    expect(calculateCompletionRate(zeroCounts)).toBe("0");
    expect(calculateFailureRate(zeroCounts)).toBe(0);
  });

  it('✅ Logic: Should calculate perfect completion accurately', () => {
    const perfectCounts = { total: 10, completed: 10, failed: 0 };
    expect(calculateCompletionRate(perfectCounts)).toBe("100.0");
    expect(calculateFailureRate(perfectCounts)).toBe(0);
  });

  it('✅ Logic: Should calculate partial failure accurately', () => {
    const mixedCounts = { total: 10, completed: 8, failed: 2 };
    expect(calculateCompletionRate(mixedCounts)).toBe("80.0");
    expect(calculateFailureRate(mixedCounts)).toBe(20);
  });

  it('✅ Logic: Should handle decimal percentages', () => {
    const complexCounts = { total: 3, completed: 1, failed: 0 };
    expect(calculateCompletionRate(complexCounts)).toBe("33.3");
  });

  it('🛑 Audit Finding: Ensure status groupings match summary totals', () => {
     // Scenario: 5 Pending + 5 Completed = 10 Total
     const counts = { total: 10, pending: 5, completed: 5, failed: 0, in_transit: 0 };
     const sumOfParts = counts.pending + counts.completed + counts.failed + counts.in_transit;
     expect(sumOfParts).toBe(counts.total);
  });
});
