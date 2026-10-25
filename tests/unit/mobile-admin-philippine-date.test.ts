import { describe, expect, it } from 'vitest';
import { getPhilippineDateString } from '../../mobile-admin/utils/date';

describe('mobile admin Philippine date', () => {
  it('uses the next Philippine calendar day when UTC is still on the previous day', () => {
    expect(getPhilippineDateString(new Date('2026-10-09T17:00:00.000Z'))).toBe('2026-10-10');
  });

  it('keeps the Philippine day after the UTC date has also advanced', () => {
    expect(getPhilippineDateString(new Date('2026-10-10T01:00:00.000Z'))).toBe('2026-10-10');
  });
});
