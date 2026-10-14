const DEVELOPMENT_JWT_SECRET = 'fallback_secret_for_dev_only';
const DEVELOPMENT_REFRESH_SECRET = 'fallback_refresh_secret_dev';

const isPlaceholder = (value: string) => /^(your_|change.?me|secret$|fallback)/i.test(value);

export function validateProductionSecurityConfig(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const access = env.JWT_SECRET?.trim();
  const refresh = env.JWT_REFRESH_SECRET?.trim();
  if (!access || access.length < 32 || isPlaceholder(access)) {
    throw new Error('Production requires JWT_SECRET with at least 32 non-placeholder characters.');
  }
  if (!refresh || refresh.length < 32 || isPlaceholder(refresh)) {
    throw new Error('Production requires JWT_REFRESH_SECRET with at least 32 non-placeholder characters.');
  }
  if (access === refresh) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values in production.');
  }
}

export function getJwtSecret() {
  validateProductionSecurityConfig();
  return process.env.JWT_SECRET || DEVELOPMENT_JWT_SECRET;
}

export function getRefreshSecret() {
  validateProductionSecurityConfig();
  return process.env.JWT_REFRESH_SECRET || DEVELOPMENT_REFRESH_SECRET;
}
