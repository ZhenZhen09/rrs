import { parseLocalDate, getLocalDateStr, formatDisplayDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD string correctly', () => {
      const date = parseLocalDate('2024-03-30');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // 0-indexed
      expect(date.getDate()).toBe(30);
    });

    it('should parse ISO string correctly', () => {
      const date = parseLocalDate('2024-03-30T10:00:00Z');
      expect(date instanceof Date).toBe(true);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  describe('getLocalDateStr', () => {
    it('should return YYYY-MM-DD for a Date object', () => {
      const date = new Date(2024, 2, 30); // March 30
      expect(getLocalDateStr(date)).toBe('2024-03-30');
    });

    it('should return the same string if already YYYY-MM-DD', () => {
      expect(getLocalDateStr('2024-03-30')).toBe('2024-03-30');
    });

    it('should preserve the delivery calendar date from ISO-like API values', () => {
      expect(getLocalDateStr('2024-03-30T00:00:00.000Z')).toBe('2024-03-30');
    });
  });

  describe('formatDisplayDate', () => {
    it('should format YYYY-MM-DD for display', () => {
      const formatted = formatDisplayDate('2024-03-30');
      expect(formatted).toMatch(/Mar 30, 2024/);
    });
  });
});
