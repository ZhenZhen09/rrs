import { describe, expect, it } from 'vitest';
import { collatedJsonEquals } from '../sqlCollation';

describe('SQL collation helpers', () => {
  it('normalizes JSON string comparisons to the application collation', () => {
    expect(collatedJsonEquals("JSON_UNQUOTE(JSON_EXTRACT(sal.new_values, '$.status'))", 'dr.status'))
      .toBe("CONVERT(JSON_UNQUOTE(JSON_EXTRACT(sal.new_values, '$.status')) USING utf8mb4) COLLATE utf8mb4_unicode_ci = dr.status COLLATE utf8mb4_unicode_ci");
  });
});
