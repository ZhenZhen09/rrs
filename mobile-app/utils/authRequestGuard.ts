export function getBearerToken(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object') return null;

  const values = headers as Record<string, unknown> & { get?: (name: string) => unknown };
  const authorization = values.get?.('Authorization') ?? values.Authorization ?? values.authorization;
  if (typeof authorization !== 'string') return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function isCurrentAuthenticatedRequest(requestToken: string | null, currentToken: string | null): boolean {
  return Boolean(requestToken && currentToken && requestToken === currentToken);
}
