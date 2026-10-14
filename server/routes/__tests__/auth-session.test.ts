import { describe, expect, it } from 'vitest';
import { getRememberMe } from '../authSession';

describe('auth session policy', () => {
  it('keeps mobile sessions refreshable beyond the default session window', () => {
    expect(getRememberMe({ headers: { 'x-client-type': 'mobile' } }, false)).toBe(true);
  });

  it('honors rememberMe for web sessions', () => {
    expect(getRememberMe({ headers: {} }, false)).toBe(false);
    expect(getRememberMe({ headers: {} }, true)).toBe(true);
  });
});
