import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, connectionQuery, connection, sendNotification } = vi.hoisted(() => {
  const connectionQuery = vi.fn();
  const connection = {
    query: connectionQuery,
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  return {
    poolQuery: vi.fn(), connectionQuery, connection,
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../db', () => ({ pool: { query: poolQuery, getConnection: vi.fn(async () => connection) } }));
vi.mock('web-push', () => ({ default: { sendNotification, setVapidDetails: vi.fn() } }));
vi.mock('../webPush', () => ({ isWebPushConfigured: () => true }));

import { dispatchPendingWebPushBatch, getWebPushRetryDelayMs, makeWebPushPayload } from '../webPushQueue';

const work = {
  notification_id: 'notif-1', user_id: 'admin-1', recipient_role: 'admin',
  notification_type: 'request_submitted', request_id: 'req-1',
};
const subscription = { endpoint_hash: 'hash-1', user_id: 'admin-1', endpoint: 'https://push.example/secret', p256dh: 'key-p', auth: 'key-a' };
const delivery = { ...subscription, attempts: 0 };

function setupOnePendingDelivery(send = vi.fn().mockResolvedValue(undefined)) {
  sendNotification.mockImplementation(send);
  let queueClaims = 0;
  let deliveryClaims = 0;
  connectionQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT notification_id, user_id, recipient_role')) {
      queueClaims += 1;
      return [queueClaims === 1 ? [work] : [], []];
    }
    if (sql.includes('SELECT endpoint_hash, user_id FROM web_push_subscriptions')) return [[subscription], []];
    if (sql.includes('SELECT d.endpoint_hash')) {
      deliveryClaims += 1;
      return [deliveryClaims === 1 ? [delivery] : [], []];
    }
    return [{ affectedRows: 1 }, []];
  });
  poolQuery.mockImplementation(async (sql: string) => String(sql).includes('LEFT JOIN web_push_queue')
    ? [[], []]
    : [{ affectedRows: 1 }, []]);
}

describe('web push dispatch policy', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    connectionQuery.mockReset();
    connection.beginTransaction.mockClear();
    connection.commit.mockClear();
    connection.rollback.mockClear();
    connection.release.mockClear();
    sendNotification.mockReset().mockResolvedValue(undefined);
  });

  it('uses bounded retry backoff', () => {
    expect(getWebPushRetryDelayMs(1)).toBe(1000);
    expect(getWebPushRetryDelayMs(2)).toBe(2000);
    expect(getWebPushRetryDelayMs(20)).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('builds concise role-specific payloads without using saved request details', () => {
    const admin = makeWebPushPayload({
      id: 'notif-1', user_id: 'admin-1', type: 'request_submitted', request_id: 'req 123', role: 'admin',
      message: 'Sensitive recipient phone number 555-0100',
    });
    const personnel = makeWebPushPayload({
      id: 'notif-2', user_id: 'personnel-1', type: 'request_revision', request_id: 'req/456', role: 'personnel',
      message: 'Sensitive revision details',
    });

    expect(admin).toMatchObject({
      tag: 'notif-1', data: { notificationId: 'notif-1', requestId: 'req 123', url: '/admin/dashboard?request=req%20123' },
    });
    expect(personnel.data.url).toBe('/personnel/v2?request=req%2F456');
    expect(JSON.stringify([admin, personnel])).not.toContain('Sensitive');
  });

  it('sends once per endpoint and marks a successful endpoint complete', async () => {
    setupOnePendingDelivery();

    await dispatchPendingWebPushBatch();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'sent'"),
      ['notif-1', 'hash-1', 'admin-1'],
    );
    expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining("d.status IN ('pending', 'processing')"), ['notif-1']);
  });

  it('claims queue rows with MariaDB-compatible row locking', async () => {
    setupOnePendingDelivery();

    await dispatchPendingWebPushBatch();

    const claimQueries = connectionQuery.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) => sql.includes('FOR UPDATE'));
    expect(claimQueries.length).toBeGreaterThanOrEqual(2);
    expect(claimQueries.every((sql) => !sql.includes('SKIP LOCKED'))).toBe(true);
  });

  it('removes expired subscriptions and records them as gone', async () => {
    const send = vi.fn().mockRejectedValue(Object.assign(new Error('private endpoint detail'), { statusCode: 410 }));
    setupOnePendingDelivery(send);

    await dispatchPendingWebPushBatch();

    expect(poolQuery).toHaveBeenCalledWith(
      'DELETE FROM web_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', ['hash-1', 'admin-1'],
    );
    expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining("SET status = 'gone'"), ['410', 'notif-1', 'hash-1', 'admin-1']);
  });

  it('retries transient failures without logging provider details', async () => {
    const send = vi.fn().mockRejectedValue(Object.assign(new Error('provider response contains private URL'), { statusCode: 503 }));
    setupOnePendingDelivery(send);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await dispatchPendingWebPushBatch();

    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('next_attempt_at = DATE_ADD'),
      ['pending', 1_000_000, '503', 'notif-1', 'hash-1', 'admin-1'],
    );
    expect(errorSpy).toHaveBeenCalledWith('[WEB PUSH] Delivery attempt failed:', '503');
    expect(errorSpy).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining('private URL'));
    errorSpy.mockRestore();
  });
});
