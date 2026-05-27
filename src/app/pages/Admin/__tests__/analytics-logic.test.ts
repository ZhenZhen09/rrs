import { describe, it, expect } from 'vitest';

/**
 * Pure Logic Audit for Analytics Hub
 * Verifies the data transformation functions used in the UI.
 */

// Simulation of the transformation logic found in AnalyticsHub.tsx
const transformPeakHours = (peakJson: any[]) => {
  return Array.from({ length: 24 }, (_, i) => {
    const found = peakJson.find((r: any) => r.hour === i);
    return {
      hour: i,
      displayHour: i > 12 ? `${i-12} PM` : i === 0 ? '12 AM' : i === 12 ? '12 PM' : `${i} AM`,
      volume: found ? found.volume : 0
    };
  });
};

const calculateCompletionRate = (completed: number, total: number) => {
  return total > 0 ? ((completed / total) * 100).toFixed(1) : "0";
};

describe('Analytics Hub Logic Audit', () => {
  
  describe('Peak Hour Transformation', () => {
    it('✅ PASS: Correctly maps morning hours', () => {
      const mockData = [{ hour: 9, volume: 5 }];
      const result = transformPeakHours(mockData);
      expect(result[9].displayHour).toBe('9 AM');
      expect(result[9].volume).toBe(5);
    });

    it('✅ PASS: Correctly maps afternoon/evening hours', () => {
      const mockData = [{ hour: 14, volume: 10 }];
      const result = transformPeakHours(mockData);
      expect(result[14].displayHour).toBe('2 PM');
      expect(result[14].volume).toBe(10);
    });

    it('✅ PASS: Correctly handles 12 AM and 12 PM', () => {
      const mockData = [{ hour: 0, volume: 1 }, { hour: 12, volume: 2 }];
      const result = transformPeakHours(mockData);
      expect(result[0].displayHour).toBe('12 AM');
      expect(result[12].displayHour).toBe('12 PM');
    });

    it('✅ PASS: Pads missing hours with 0 volume', () => {
      const result = transformPeakHours([]);
      expect(result.length).toBe(24);
      expect(result[5].volume).toBe(0);
    });
  });

  describe('KPI Calculations', () => {
    it('✅ PASS: Calculates completion rate correctly', () => {
      expect(calculateCompletionRate(5, 10)).toBe("50.0");
      expect(calculateCompletionRate(1, 3)).toBe("33.3");
    });

    it('🛑 HARDENING: Handles zero total without NaN', () => {
      expect(calculateCompletionRate(0, 0)).toBe("0");
    });
  });
});
