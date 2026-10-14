import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { appendRequestsToRiderQueue, lockRiderQueues, normalizeRiderQueueOrder, replaceRiderQueueOrder } from '../riderTaskQueue';

const activeRows = [
  { request_id: 'active-1', delivery_status: 'in_progress', queue_order: 1, assigned_rider_id: 'r1', status: 'approved', delivery_date: '2026-10-08', created_at: '2026-10-01' },
  { request_id: 'overdue-1', delivery_status: 'assigned', queue_order: 2, assigned_rider_id: 'r1', status: 'approved', delivery_date: '2026-10-02', created_at: '2026-09-30' },
];

function createConnection() {
  const calls: Array<[string, unknown[]]> = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push([sql, params]);
    if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
    if (sql.includes('SELECT request_id, delivery_status, queue_order')) return [activeRows];
    if (sql.includes('SELECT request_id, delivery_status FROM delivery_requests')) return [[...(params[0] as string[]).map((request_id) => ({ request_id, delivery_status: 'assigned' }))]];
    return [{ affectedRows: 1 }];
  });
  return { connection: { query } as unknown as PoolConnection, query, calls };
}

describe('rider task queue persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('locks rider rows in sorted order', async () => {
    const { connection, query } = createConnection();
    await lockRiderQueues(connection, ['r2', 'r1', 'r2']);
    expect(query.mock.calls.map(([, params]) => params?.[0])).toEqual(['r1', 'r2']);
  });

  it('loads active tasks after locking and appends ranks across delivery dates', async () => {
    const { connection, query } = createConnection();
    const ranks = await appendRequestsToRiderQueue(connection, 'r1', ['new-1']);
    expect(ranks).toEqual([3]);
    const sqlCalls = query.mock.calls.map(([sql]) => String(sql));
    expect(sqlCalls.findIndex((sql) => sql.includes('SELECT id FROM users')))
      .toBeLessThan(sqlCalls.findIndex((sql) => sql.includes('SELECT request_id, delivery_status, queue_order')));
    const queueQuery = sqlCalls.find((sql) => sql.includes('SELECT request_id, delivery_status, queue_order'))!;
    expect(queueQuery).not.toContain('delivery_date =');
    expect(query.mock.calls.some(([sql, params]) => String(sql).includes('SET queue_order = ?') && params?.[0] === 3)).toBe(true);
  });

  it('preserves a submitted order when appending a batch', async () => {
    const { connection, query } = createConnection();
    await appendRequestsToRiderQueue(connection, 'r1', ['new-1', 'new-2'], ['new-2', 'new-1']);
    const finalWrites = query.mock.calls.filter(([sql, params]) => String(sql).includes('SET queue_order = ?') && Number(params?.[0]) <= 4);
    expect(finalWrites.slice(-4).map(([, params]) => params?.[1])).toEqual(['active-1', 'overdue-1', 'new-2', 'new-1']);
  });

  it('keeps reassigned started work ahead of the target rider’s unstarted work', async () => {
    const { connection, query } = createConnection();
    query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
      if (sql.includes('SELECT request_id, delivery_status, queue_order')) return [activeRows];
      if (sql.includes('SELECT request_id, delivery_status FROM delivery_requests')) return [[{ request_id: 'new-started', delivery_status: 'arrived_at_pickup' }]];
      return [{ affectedRows: 1 }];
    });
    await appendRequestsToRiderQueue(connection, 'r1', ['new-started']);
    const finalWrites = query.mock.calls.filter(([sql, params]) => String(sql).includes('SET queue_order = ?') && Number(params?.[0]) <= 3);
    expect(finalWrites.slice(-3).map(([, params]) => params?.[1])).toEqual(['active-1', 'new-started', 'overdue-1']);
  });

  it('does not read a second assignment queue until the rider lock is released', async () => {
    let releaseFirstLock!: () => void;
    let firstHasLock = false;
    let queueReads = 0;
    const sharedRows: Array<(typeof activeRows)[number]> = [...activeRows];
    const lockReleased = new Promise<void>((resolve) => { releaseFirstLock = resolve; });
    const makeConnection = (second: boolean) => ({ query: vi.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('SELECT id FROM users')) {
        if (second) await lockReleased;
        else firstHasLock = true;
        return [[{ id: params[0] }]];
      }
      if (sql.includes('SELECT request_id, delivery_status, queue_order')) {
        queueReads += 1;
        return [[...sharedRows].sort((a, b) => (a.queue_order || Number.MAX_SAFE_INTEGER) - (b.queue_order || Number.MAX_SAFE_INTEGER))];
      }
      if (sql.includes('SELECT request_id, delivery_status FROM delivery_requests')) {
        return [[...(params[0] as string[]).map((request_id) => ({ request_id, delivery_status: 'assigned' }))]];
      }
      if (sql.includes('UPDATE delivery_requests SET queue_order = ?')) {
        const [queue_order, request_id] = params as [number, string];
        const row = sharedRows.find((item) => item.request_id === request_id);
        if (row) row.queue_order = queue_order;
        else sharedRows.push({ request_id, queue_order, delivery_status: 'assigned', assigned_rider_id: 'r1', status: 'approved', delivery_date: '2026-10-08', created_at: '2026-10-08' });
      }
      return [{ affectedRows: 1 }];
    }) });
    const firstConnection = makeConnection(false);
    const secondConnection = makeConnection(true);
    const firstAppend = appendRequestsToRiderQueue(firstConnection as unknown as PoolConnection, 'r1', ['new-1']).then((ranks) => {
      releaseFirstLock();
      return ranks;
    });
    await Promise.resolve();
    expect(firstHasLock).toBe(true);
    const secondAppend = appendRequestsToRiderQueue(secondConnection as unknown as PoolConnection, 'r1', ['new-2']);
    await Promise.resolve();
    expect(queueReads).toBe(1);
    const [firstRanks, secondRanks] = await Promise.all([firstAppend, secondAppend]);
    expect(firstRanks).toEqual([3]);
    expect(secondRanks).toEqual([4]);
    expect(queueReads).toBe(2);
  });

  it('rejects a missing rider and an incoming request not assigned to that rider', async () => {
    const missing = createConnection();
    missing.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[]] : [[]]);
    await expect(lockRiderQueues(missing.connection, ['missing'])).rejects.toThrow('does not exist');

    const unknown = createConnection();
    unknown.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
      if (sql.includes('SELECT request_id, delivery_status, queue_order')) return [activeRows];
      if (sql.includes('SELECT request_id, delivery_status FROM delivery_requests')) return [[]];
      return [{ affectedRows: 1 }];
    });
    await expect(appendRequestsToRiderQueue(unknown.connection, 'r1', ['foreign'])).rejects.toThrow('active task assigned');
  });

  it('rejects stale replacement and propagates persistence failures', async () => {
    const stale = createConnection();
    await expect(replaceRiderQueueOrder(stale.connection, 'r1', ['active-1']))
      .rejects.toThrow('every active task exactly once');

    const failed = createConnection();
    failed.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
      if (sql.includes('SELECT request_id, delivery_status, queue_order')) return [activeRows];
      if (sql.includes('SELECT request_id, delivery_status FROM delivery_requests')) return [[{ request_id: 'new-1', delivery_status: 'assigned' }]];
      if (sql.includes('SET queue_order')) throw new Error('rank write failed');
      return [{ affectedRows: 1 }];
    });
    await expect(appendRequestsToRiderQueue(failed.connection, 'r1', ['new-1'])).rejects.toThrow('rank write failed');
  });

  it('compacts the remaining queue after a reassignment', async () => {
    const { connection, query } = createConnection();
    await normalizeRiderQueueOrder(connection, 'r1');
    expect(query.mock.calls.some(([sql, params]) => String(sql).includes('SET queue_order = ?') && params?.[0] === 2)).toBe(true);
  });
});
