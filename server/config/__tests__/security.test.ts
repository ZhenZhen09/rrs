import { describe, expect, it } from 'vitest';
import { validateProductionSecurityConfig } from '../security';

const secure = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
} as NodeJS.ProcessEnv;

describe('production token secret configuration', () => {
  it('accepts two separate sufficiently long production secrets', () => {
    expect(() => validateProductionSecurityConfig(secure)).not.toThrow();
  });
  it.each([
    { ...secure, JWT_SECRET: undefined },
    { ...secure, JWT_REFRESH_SECRET: undefined },
    { ...secure, JWT_SECRET: 'short' },
    { ...secure, JWT_SECRET: 'your_jwt_secret_here________________' },
    { ...secure, JWT_REFRESH_SECRET: 'a'.repeat(48) },
  ])('rejects missing, weak, placeholder, or reused production secrets', (env) => {
    expect(() => validateProductionSecurityConfig(env as NodeJS.ProcessEnv)).toThrow();
  });
  it('allows documented local development fallbacks', () => {
    expect(() => validateProductionSecurityConfig({ NODE_ENV: 'development' })).not.toThrow();
  });
});
