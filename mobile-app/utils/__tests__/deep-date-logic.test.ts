import { getLocalDateStr, parseLocalDate } from '../dateUtils';

describe('Deep Date Logic Audit', () => {
  // Scenario 1: Timezone Shift (The "Midnight" Bug)
  it('should correctly identify the local date at 11:59 PM', () => {
    // Pass the string DIRECTLY to test the new extraction logic
    const lateNight = '2026-05-25T23:59:59Z';
    expect(getLocalDateStr(lateNight)).toBe('2026-05-25');
  });

  // Scenario 2: Leap Year
  it('should handle leap years correctly', () => {
    const leapDay = '2024-02-29T10:00:00Z';
    expect(getLocalDateStr(leapDay)).toBe('2024-02-29');
  });

  // Scenario 3: New Year Transition
  it('should handle year-end transitions', () => {
    const newYearEve = '2025-12-31T20:00:00Z';
    expect(getLocalDateStr(newYearEve)).toBe('2025-12-31');
  });

  // Scenario 4: String Parsing Stability
  it('should parse YYYY-MM-DD strings without shifting the day', () => {
    const dateStr = '2026-05-25';
    const parsed = parseLocalDate(dateStr);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4); // May is 4
    expect(parsed.getDate()).toBe(25);
  });
});
