import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, getConnection, recordConnectivityLog, emittedEvents, connectionQuery } = vi.hoisted(() => ({
  poolQuery: vi.fn(), getConnection: vi.fn(), recordConnectivityLog: vi.fn(), emittedEvents: [] as any[], connectionQuery: vi.fn(),
}));
vi.mock('../../db', () => ({ pool: { query: poolQuery, getConnection } }));
vi.mock('../../middleware/auth', () => ({ authorize: () => (req: any, _res: any, next: () => void) => { req.user = { id: 'rider-1', role: 'rider', name: 'Riley' }; next(); } }));
vi.mock('../../presence', () => ({ onlineRiders: new Map() }));
vi.mock('../../locationTracking', () => ({ handleRiderLocationUpdate: vi.fn() }));
vi.mock('../../services/connectivityLogger', () => ({ recordConnectivityLog }));
vi.mock('../../services/locationEventReceipts', () => ({ ensureLocationEventReceiptsTable: vi.fn() }));
import usersRouter from '../users';
const app = express(); app.use(express.json());
app.use((req: any, _res, next) => { req.app.set('io', { to: (room: string) => ({ emit: (event: string, payload: any) => emittedEvents.push({ room, event, payload }) }) }); next(); });
app.use('/api/users', usersRouter);
const connection = { query: connectionQuery, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
let activeTasks: any[];

describe('rider shift session end route', () => {
  beforeEach(() => {
    vi.clearAllMocks(); emittedEvents.length = 0; activeTasks = [];
    poolQuery.mockResolvedValue([[]]);
    connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: 'rider-1' }]];
      if (sql.includes('shift_operation_receipts')) return [[]];
      if (sql.includes("session_state = 'open'")) return [[{ id: 'shift-1', rider_id: 'rider-1', start_time: '2026-10-21 08:00:00', end_time: null }]];
      if (sql.includes('SELECT request_id FROM delivery_requests')) return [activeTasks];
      if (sql.includes('SELECT * FROM shift_sessions WHERE id')) return [[{ id: 'shift-1', active_task_count_at_end: activeTasks.length, handover_reason: 'Vehicle breakdown' }]];
      return [{}];
    });
    getConnection.mockResolvedValue(connection); recordConnectivityLog.mockResolvedValue(undefined);
  });

  it('rejects absent attendance while a shift is open without changing rider state', async () => {
    connectionQuery.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]]
      : sql.includes("session_state = 'open'") ? [[{ id: 'shift-1', session_state: 'open' }]] : [[]]);
    const response = await request(app).post('/api/users/rider-1/attendance').send({ status: 'absent', reason: 'Sick' });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('OPEN_SHIFT');
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toBe(false);
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE users SET is_on_duty'))).toBe(false);
    expect(emittedEvents).toHaveLength(0);
  });

  it('lets riders go offline without closing their work shift', async () => {
    const response = await request(app).post('/api/users/rider-1/duty').send({ is_on_duty: false, operation_id: 'offline-1' });
    expect(response.status).toBe(200);
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE shift_sessions SET end_time'))).toBe(false);
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE users SET is_on_duty = ?'))).toBe(true);
    expect(response.body.is_on_duty).toBe(false);
    expect(emittedEvents).toContainEqual({
      room: 'admin-room', event: 'rider-status-updated',
      payload: { riderId: 'rider-1', riderName: 'Riley', type: 'duty', is_on_duty: false },
    });
  });

  it('only restores availability when going online during an open shift', async () => {
    const response = await request(app).post('/api/users/rider-1/duty').send({ is_on_duty: true, operation_id: 'online-1' });
    expect(response.status).toBe(200);
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO shift_sessions'))).toBe(false);
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE users SET is_on_duty = ?'))).toBe(true);
    expect(response.body.is_on_duty).toBe(true);
    expect(emittedEvents).toContainEqual({
      room: 'admin-room', event: 'rider-status-updated',
      payload: { riderId: 'rider-1', riderName: 'Riley', type: 'duty', is_on_duty: true },
    });
  });

  it('requires a nonblank handover reason when explicitly ending with active tasks', async () => {
    activeTasks = [{ request_id: 'task-1' }];
    const response = await request(app).post('/api/users/rider-1/shift/end').send({ operation_id: 'end-1', reason: '   ' });
    expect(response.status).toBe(400); expect(response.body.code).toBe('HANDOVER_REQUIRED');
    expect(connection.rollback).toHaveBeenCalledOnce(); expect(emittedEvents).toHaveLength(0);
  });

  it('closes a session only on explicit end, keeps tasks assigned, and notifies after commit', async () => {
    activeTasks = [{ request_id: 'task-1' }, { request_id: 'task-2' }];
    const response = await request(app).post('/api/users/rider-1/shift/end').send({ operation_id: 'end-2', reason: ' Vehicle breakdown ' });
    expect(response.status).toBe(200); expect(connection.commit).toHaveBeenCalledOnce();
    expect(connectionQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE shift_sessions SET end_time'), ['end-2', 'Vehicle breakdown', 2, 'shift-1']);
    expect(connectionQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE attendance_logs SET off_duty_time'), ['rider-1', '2026-10-21 08:00:00']);
    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE delivery_requests'))).toBe(false);
    expect(emittedEvents.some(({ event }) => event === 'notification-added')).toBe(true);
  });

  it('rolls back and emits no success event if persisting the session end fails', async () => {
    connectionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM users')) return [[{ id: 'rider-1' }]];
      if (sql.includes('shift_operation_receipts')) return [[]];
      if (sql.includes("session_state = 'open'")) return [[{ id: 'shift-1' }]];
      if (sql.includes('movement_events')) throw new Error('session end event write failed');
      return [[]];
    });
    const response = await request(app).post('/api/users/rider-1/shift/end').send({ operation_id: 'end-3' });
    expect(response.status).toBe(500); expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.commit).not.toHaveBeenCalled(); expect(emittedEvents).toHaveLength(0);
  });

  it('rejects a different end attempt when there is no open session', async () => {
    connectionQuery.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]] : [[]]);
    const response = await request(app).post('/api/users/rider-1/shift/end').send({ operation_id: 'end-4' });
    expect(response.status).toBe(409); expect(response.body.code).toBe('NO_OPEN_SHIFT');
  });
});

