import { describe, expect, it, vi } from 'vitest';

const { migrate } = require('../../scripts/migrate-rider-fcm-tokens.cjs');

describe('rider FCM token migration', () => {
  it('adds the nullable FCM token column when it is missing', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const result = await migrate({ query }, { logger: { log: vi.fn() } });

    expect(query.mock.calls[1][0]).toContain('ADD COLUMN fcm_token TEXT NULL');
    expect(result).toEqual({ changed: true, dryRun: false });
  });

  it('does not add the token column twice', async () => {
    const query = vi.fn().mockResolvedValueOnce([[{ Field: 'fcm_token' }]]);

    const result = await migrate({ query }, { logger: { log: vi.fn() } });

    expect(query).toHaveBeenCalledOnce();
    expect(result).toEqual({ changed: false, dryRun: false });
  });

  it('reports a dry run without changing the database', async () => {
    const query = vi.fn().mockResolvedValueOnce([[]]);

    const result = await migrate({ query }, { dryRun: true, logger: { log: vi.fn() } });

    expect(query).toHaveBeenCalledOnce();
    expect(result).toEqual({ changed: true, dryRun: true });
  });
});
