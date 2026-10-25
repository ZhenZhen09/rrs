import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(), poolQuery: vi.fn(), query: vi.fn(), statusLogs: 0,
  current: { status: 'approved', delivery_status: 'pending', assigned_rider_id: 'rider-1', requester_id: null },
  operations: new Map<string, any>(),
}));

vi.mock('../../db', () => ({ pool: { getConnection: mocks.getConnection, query: mocks.poolQuery } }));
vi.mock('../../presence', () => ({ onlineRiders: new Map() }));
vi.mock('../../middleware/auth', () => ({ authorize: () => (_req: any, _res: any, next: () => void) => next() }));
vi.mock('../../services/auditLogger', () => ({ logAction: vi.fn() }));
vi.mock('../../services/deliveryNotifications', () => ({
  persistDeliveryNotification: vi.fn(), publishDeliveryNotification: vi.fn(), persistAdminDispatchNotifications: vi.fn(),
}));
vi.mock('../../services/riderTaskQueue', () => ({
  appendRequestsToRiderQueue: vi.fn(), lockRiderQueues: vi.fn(), normalizeRiderQueueOrder: vi.fn(), replaceRiderQueueOrder: vi.fn(),
}));
vi.mock('../notifications', () => ({ sendPushNotification: vi.fn() }));

import requestsRouter from '../requests';
import { idempotency } from '../../middleware/idempotency';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.user = { id: 'rider-1', role: 'rider' };
  next();
});
app.use('/api/requests', idempotency, requestsRouter);

const connection = {
  query: mocks.query,
  beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
};

describe('durable rider status operation IDs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.statusLogs = 0;
    mocks.current.status = 'approved';
    mocks.current.delivery_status = 'pending';
    mocks.current.assigned_rider_id = 'rider-1';
    mocks.operations.clear();
    mocks.getConnection.mockResolvedValue(connection);
    mocks.poolQuery.mockResolvedValue([[]]);
    mocks.query.mockImplementation(async (sql: string, values: any[] = []) => {
      if (sql.includes('SELECT status, delivery_status, assigned_rider_id')) return [[mocks.current]];
      if (sql.includes('FROM rider_status_operations')) return [[mocks.operations.get(`${values[0]}:${values[1]}`)].filter(Boolean)];
      if (sql.includes('INSERT INTO status_logs')) { mocks.statusLogs += 1; return [{ affectedRows: 1 }]; }
      if (sql.includes('UPDATE delivery_requests SET delivery_status')) {
        mocks.current.delivery_status = values[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('INSERT INTO rider_status_operations')) {
        const [rider_id, operation_id, request_id, payload_hash, delivery_status, responseJson] = values;
        mocks.operations.set(`${rider_id}:${operation_id}`, {
          rider_id, operation_id, request_id, payload_hash, delivery_status, response_json: responseJson,
        });
        return [{ affectedRows: 1 }];
      }
      return [[]];
    });
  });

  it('replays the committed response without a second status update or log', async () => {
    const sendStatus = () => request(app).put('/api/requests/request-1/status')
      .set('Idempotency-Key', 'rider-operation-1').send({ status: 'in_progress', remark: 'Started', timestamp: '2026-10-21T08:00:00.000Z' });
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const first = await sendStatus();
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
      const replay = await sendStatus();

      expect(first.status).toBe(200);
      expect(replay.status).toBe(200);
      expect(replay.body).toEqual(first.body);
      expect(first.body).toMatchObject({ success: true, operationId: 'rider-operation-1', deliveryStatus: 'in_progress' });
      expect(mocks.statusLogs).toBe(1);
      expect(mocks.query.mock.calls.filter(([sql]) => String(sql).startsWith('UPDATE delivery_requests SET delivery_status'))).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects reuse of an operation ID with a changed payload', async () => {
    await request(app).put('/api/requests/request-1/status').set('Idempotency-Key', 'rider-operation-2')
      .send({ status: 'in_progress', remark: 'Started' });
    const changed = await request(app).put('/api/requests/request-1/status').set('Idempotency-Key', 'rider-operation-2')
      .send({ status: 'assigned', remark: 'Changed' });

    expect(changed.status).toBe(409);
    expect(mocks.statusLogs).toBe(1);
  });

  it('retains assignment authorization and terminal-state validation', async () => {
    mocks.current.assigned_rider_id = 'rider-2';
    const unauthorized = await request(app).put('/api/requests/request-1/status')
      .set('Idempotency-Key', 'unauthorized-operation').send({ status: 'in_progress' });
    expect(unauthorized.status).toBe(403);

    mocks.current.assigned_rider_id = 'rider-1';
    mocks.current.delivery_status = 'completed';
    const terminal = await request(app).put('/api/requests/request-1/status')
      .set('Idempotency-Key', 'terminal-operation').send({ status: 'in_progress' });
    expect(terminal.status).toBe(400);
    expect(mocks.statusLogs).toBe(0);
  });
});
