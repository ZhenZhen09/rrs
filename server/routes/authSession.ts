export const getRememberMe = (
  req: { headers: Record<string, unknown> },
  requestedRememberMe = false,
) => requestedRememberMe || req.headers['x-client-type'] === 'mobile';
