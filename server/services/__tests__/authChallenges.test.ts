import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../db', () => ({ pool: { query } }));

describe('pre-authentication challenges', () => {
  beforeEach(async () => {
    vi.resetModules();
    query.mockReset();
    query.mockResolvedValue([[], []]);
  });

  it('stores only a hash of the opaque challenge token', async () => {
    const { issueAuthChallenge } = await import('../authChallenges');
    const token = await issueAuthChallenge('user-1', 'mfa_login');
    const insert = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO auth_challenges'));

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(insert?.[1][0]).toBe(createHash('sha256').update(token).digest('hex'));
    expect(insert?.[1][0]).not.toBe(token);
    expect(insert?.[1]).toEqual([expect.any(String), 'user-1', 'mfa_login', '{}', expect.any(String)]);
  });

  it('finds an unused, unexpired challenge only for its requested purpose', async () => {
    const { findAuthChallenge } = await import('../authChallenges');
    query.mockResolvedValueOnce([[], []]);
    const token = 'a'.repeat(43);
    query.mockResolvedValueOnce([[{ user_id: 'user-1', payload: '{"secret":"test-secret"}' }], []]);

    await expect(findAuthChallenge(token, 'mfa_setup_verify')).resolves.toEqual({
      userId: 'user-1',
      payload: { secret: 'test-secret' },
    });
    const [sql, params] = query.mock.calls[1];
    expect(String(sql)).toContain('purpose = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3)');
    expect(params).toEqual([createHash('sha256').update(token).digest('hex'), 'mfa_setup_verify']);
  });

  it('allows a challenge to be consumed once and rejects a replay', async () => {
    const { consumeAuthChallenge } = await import('../authChallenges');
    query.mockResolvedValueOnce([[], []]);
    const token = 'b'.repeat(43);
    query.mockResolvedValueOnce([{ affectedRows: 1 }, []]).mockResolvedValueOnce([{ affectedRows: 0 }, []]);

    await expect(consumeAuthChallenge(token, 'password_reset')).resolves.toBe(true);
    await expect(consumeAuthChallenge(token, 'password_reset')).resolves.toBe(false);
    expect(String(query.mock.calls[1][0])).toContain('consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3)');
    expect(String(query.mock.calls[2][0])).toContain('consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(3)');
  });
});
