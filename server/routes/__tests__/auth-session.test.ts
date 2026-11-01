import { describe, expect, it } from 'vitest';
import { getRememberMe } from '../authSession';

describe('auth session policy', () => {
  it('honors explicit rememberMe preferences independent of client type', () => {
    expect(getRememberMe(false)).toBe(false);
    expect(getRememberMe(true)).toBe(true);
    expect(getRememberMe(undefined)).toBe(false);
  });
});
