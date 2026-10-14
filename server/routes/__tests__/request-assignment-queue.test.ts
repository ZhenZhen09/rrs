import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(), connectionQuery: vi.fn(), append: vi.fn(), lock: vi.fn(), normalize: vi.fn(), replace: vi.fn(),
  onlineRiders: new Map<string, { socketId: string; lastSeen: number }>(),
  persistNotification: vi.fn(), publishNotification: vi.fn(), persistAdminNotifications: vi.fn(),
  audit: vi.fn(), emitted: [] as Array<{ event: string; payload: unknown }>,
}));

vi.mock('../../db', () => ({ pool: { getConnection: mocks.getConnection, query: vi.fn() } }));
vi.mock('../../presence', () => ({ onlineRiders: mocks.onlineRiders }));
vi.mock('../../middleware/auth', () => ({ authorize: () => (req: any, _res: any, next: () => void) => { req.user = { id: 'admin-1', role: 'admin' }; next(); } }));
vi.mock('../../middleware/validate', () => ({ validate: () => (_req: any, _res: any, next: () => void) => next() }));
vi.mock('../../services/auditLogger', () => ({ logAction: mocks.audit }));
vi.mock('../../services/riderTaskQueue', () => ({
  appendRequestsToRiderQueue: mocks.append,
  lockRiderQueues: mocks.lock,
  normalizeRiderQueueOrder: mocks.normalize,
  replaceRiderQueueOrder: mocks.replace,
}));
vi.mock('../../services/deliveryNotifications', () => ({
  persistDeliveryNotification: mocks.persistNotification,
  publishDeliveryNotification: mocks.publishNotification,
  persistAdminDispatchNotifications: mocks.persistAdminNotifications,
}));
vi.mock('../notifications', () => ({ sendPushNotification: vi.fn() }));

import requestsRouter from '../requests';
import { RiderQueueValidationError } from '../../utils/riderQueue';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  const io: any = { to: () => io, emit: (event: string, payload: unknown) => mocks.emitted.push({ event, payload }) };
  req.app.set('io', io);
  next();
});
app.use('/api/requests', requestsRouter);

const connection = {
  query: mocks.connectionQuery,
  beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
};

describe('request assignment queue routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onlineRiders.clear();
    mocks.emitted.length = 0;
    mocks.getConnection.mockResolvedValue(connection);
    mocks.persistNotification.mockImplementation(async (_conn: unknown, input: any) => ({ ...input, id: 'notification-1' }));
    mocks.publishNotification.mockResolvedValue(undefined);
    mocks.persistAdminNotifications.mockResolvedValue([]);
    mocks.append.mockResolvedValue([3]);
    mocks.replace.mockResolvedValue(['task-1']);
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT status, delivery_status, delivery_date')) return [[{ status: 'pending', delivery_status: 'pending', delivery_date: '2026-10-01' }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[
        { request_id: 'task-1', status: 'pending', delivery_status: 'pending', delivery_date: '2026-10-01', requester_id: 'requester-1', assigned_rider_id: null },
        { request_id: 'task-2', status: 'pending', delivery_status: 'pending', delivery_date: '2026-10-01', requester_id: 'requester-1', assigned_rider_id: null },
      ]];
      if (sql.includes('SELECT requester_id, pickup_address')) return [[{ requester_id: 'requester-1', pickup_address: 'A', dropoff_address: 'B' }]];
      return [[]];
    });
  });

  it('allows direct same-day assignment to an online on-duty rider with no attendance report', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    mocks.onlineRiders.set('rider-1', { socketId: 'socket-1', lastSeen: Date.now() });
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT status, delivery_status, delivery_date')) return [[{ status: 'pending', delivery_status: 'pending', delivery_date: today }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: null }]];
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      return [[]];
    });

    const response = await request(app).put('/api/requests/task-1/approve').send({ rider_id: 'rider-1' });

    expect(response.status).toBe(200);
    expect(mocks.append).toHaveBeenCalledWith(connection, 'rider-1', ['task-1']);
  });

  it('allows same-day batch assignment to an online on-duty rider with no attendance report', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    mocks.onlineRiders.set('rider-1', { socketId: 'socket-1', lastSeen: Date.now() });
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[{
        request_id: 'task-1', status: 'pending', delivery_status: 'pending', delivery_date: today,
        requester_id: 'requester-1', assigned_rider_id: null,
      }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: null }]];
      return [[]];
    });

    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'approve', value: 'rider-1', sequence: ['task-1'],
    });

    expect(response.status).toBe(200);
    expect(mocks.append).toHaveBeenCalledWith(connection, 'rider-1', ['task-1'], ['task-1']);
  });

  it('does not apply today attendance, duty, or presence checks to future tasks', async () => {
    const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT status, delivery_status, delivery_date')) return [[{ status: 'pending', delivery_status: 'pending', delivery_date: tomorrow }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 0, attendance_status: 'absent' }]];
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      return [[]];
    });

    const response = await request(app).put('/api/requests/task-1/approve').send({ rider_id: 'rider-1' });

    expect(response.status).toBe(200);
    expect(mocks.append).toHaveBeenCalledWith(connection, 'rider-1', ['task-1']);
  });

  it('rejects a mixed today and future batch when the rider is offline', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[
        { request_id: 'task-today', status: 'pending', delivery_status: 'pending', delivery_date: today, requester_id: 'requester-1', assigned_rider_id: null },
        { request_id: 'task-future', status: 'pending', delivery_status: 'pending', delivery_date: future, requester_id: 'requester-1', assigned_rider_id: null },
      ]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
      return [[]];
    });

    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-today', 'task-future'], action: 'approve', value: 'rider-1', sequence: ['task-today', 'task-future'],
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('RIDER_UNAVAILABLE');
    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE delivery_requests'))).toBe(false);
  });

  it('direct approval appends one task and returns the persisted queue position', async () => {
    const response = await request(app).put('/api/requests/task-1/approve').send({ rider_id: 'rider-1' });
    expect(response.status).toBe(200);
    expect(response.body.queue_order).toBe(3);
    expect(mocks.append).toHaveBeenCalledWith(connection, 'rider-1', ['task-1']);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('batch assignment appends the selected batch in its submitted order', async () => {
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1', 'task-2'], action: 'approve', value: 'rider-1', sequence: ['task-2', 'task-1'],
    });
    expect(response.status).toBe(200);
    expect(mocks.append).toHaveBeenCalledWith(connection, 'rider-1', ['task-1', 'task-2'], ['task-2', 'task-1']);
    expect(connection.commit).toHaveBeenCalledOnce();
    const lockedTaskCall = mocks.connectionQuery.mock.invocationCallOrder.find((order, index) =>
      String(mocks.connectionQuery.mock.calls[index]?.[0]).includes('FROM delivery_requests WHERE request_id IN (?) FOR UPDATE'));
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(lockedTaskCall!);
  });

  it('rejects a stale batch approval after another admin has already assigned the task', async () => {
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[{
        request_id: 'task-1', status: 'approved', delivery_status: 'assigned', delivery_date: '2026-10-01',
        requester_id: 'requester-1', assigned_rider_id: 'rider-old',
      }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'approve', value: 'rider-1', sequence: ['task-1'],
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('QUEUE_CHANGED');
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE delivery_requests'))).toBe(false);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(mocks.persistNotification).not.toHaveBeenCalled();
  });

  it('rejects a task snapshot that changes while waiting for rider locks', async () => {
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status') && sql.includes('FOR UPDATE')) return [[{
        request_id: 'task-1', status: 'approved', delivery_status: 'assigned', delivery_date: '2026-10-01',
        requester_id: 'requester-1', assigned_rider_id: 'rider-old',
      }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[{
        request_id: 'task-1', status: 'pending', delivery_status: 'pending', delivery_date: '2026-10-01',
        requester_id: 'requester-1', assigned_rider_id: null,
      }]];
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'approve', value: 'rider-1', sequence: ['task-1'],
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('QUEUE_CHANGED');
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE delivery_requests'))).toBe(false);
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('rejects a batch order containing a foreign ID before changing assignments', async () => {
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[{
        request_id: 'task-1', status: 'pending', delivery_status: 'pending', delivery_date: '2026-10-01',
        requester_id: 'requester-1', assigned_rider_id: null,
      }]];
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'approve', value: 'rider-1', sequence: ['foreign', 'task-1'],
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('QUEUE_CHANGED');
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE delivery_requests'))).toBe(false);
  });

  it('compacts the old queue on reschedule and publishes only after commit', async () => {
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT request_id, requester_id, assigned_rider_id')) return [[{
        request_id: 'task-1', requester_id: 'requester-1', assigned_rider_id: 'rider-old',
      }]];
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'reschedule', value: '2026-10-10',
    });
    expect(response.status).toBe(200);
    expect(mocks.normalize).toHaveBeenCalledWith(connection, 'rider-old');
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes('queue_order = NULL'))).toBe(true);
    expect(connection.commit.mock.invocationCallOrder[0]).toBeLessThan(mocks.publishNotification.mock.invocationCallOrder[0]);
  });

  it('rejects a reschedule if the task status changes while waiting for rider locks', async () => {
    let snapshot = 0;
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT request_id, requester_id, assigned_rider_id')) {
        snapshot += 1;
        return [[{
          request_id: 'task-1', requester_id: 'requester-1', assigned_rider_id: 'rider-old',
          status: snapshot === 1 ? 'approved' : 'completed', delivery_status: snapshot === 1 ? 'assigned' : 'completed',
        }]];
      }
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'reschedule', value: '2026-10-10',
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('QUEUE_CHANGED');
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE delivery_requests'))).toBe(false);
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('rolls back assignment and emits no notifications when queue persistence fails', async () => {
    mocks.append.mockRejectedValue(new Error('queue persistence failed'));
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1', 'task-2'], action: 'approve', value: 'rider-1', sequence: ['task-1', 'task-2'],
    });
    expect(response.status).toBe(500);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(mocks.publishNotification).not.toHaveBeenCalled();
  });

  it('normalizes the old rider queue and appends reassigned work to the target rider', async () => {
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[{
        request_id: 'task-1', status: 'approved', delivery_status: 'assigned', delivery_date: '2026-10-01',
        requester_id: 'requester-1', assigned_rider_id: 'rider-old', pickup_address: 'A', dropoff_address: 'B',
      }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'reassign', value: 'rider-1', sequence: ['task-1'],
    });
    expect(response.status).toBe(200);
    expect(mocks.lock).toHaveBeenCalledWith(connection, ['rider-old', 'rider-1']);
    expect(mocks.normalize).toHaveBeenCalledWith(connection, 'rider-old');
    expect(mocks.append).toHaveBeenCalledWith(connection, 'rider-1', ['task-1'], ['task-1']);
  });

  it('does not move same-rider reassignments or rewrite their started-task order', async () => {
    mocks.connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [[{ name: 'Rider One' }]];
      if (sql.includes('SELECT request_id, status, delivery_status')) return [[{
        request_id: 'task-1', status: 'approved', delivery_status: 'arrived_at_pickup', delivery_date: '2026-10-01',
        requester_id: 'requester-1', assigned_rider_id: 'rider-1',
      }]];
      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
      return [[]];
    });
    const response = await request(app).post('/api/requests/mass-update').send({
      taskIds: ['task-1'], action: 'reassign', value: 'rider-1', sequence: ['task-1'],
    });
    expect(response.status).toBe(200);
    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.normalize).not.toHaveBeenCalled();
    expect(mocks.persistNotification).not.toHaveBeenCalled();
  });

  it('rejects a stale queue replacement and rolls back without success notifications', async () => {
    mocks.replace.mockRejectedValue(new RiderQueueValidationError('Submitted order must contain every active task exactly once.'));
    const response = await request(app).post('/api/requests/resequence').send({ riderId: 'rider-1', sequence: ['task-1'] });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('QUEUE_CHANGED');
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(mocks.persistNotification).not.toHaveBeenCalled();
    expect(mocks.emitted).toHaveLength(0);
  });
});
