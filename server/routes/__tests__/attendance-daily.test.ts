import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, getShiftSessionsForDate, approveLateCheckIn } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getShiftSessionsForDate: vi.fn(),
  approveLateCheckIn: vi.fn(),
}));
vi.mock('../../db', () => ({ pool: { query: poolQuery, getConnection: vi.fn() } }));
vi.mock('../../presence', () => ({ onlineRiders: new Map() }));
vi.mock('../../locationTracking', () => ({ handleRiderLocationUpdate: vi.fn() }));
vi.mock('../../services/connectivityLogger', () => ({ recordConnectivityLog: vi.fn() }));
vi.mock('../../services/locationEventReceipts', () => ({ ensureLocationEventReceiptsTable: vi.fn() }));
vi.mock('../../services/shiftSessions', () => ({
  approveLateCheckIn, endShiftSession: vi.fn(), getCurrentShiftSession: vi.fn(), getShiftSessionsForDate,
  setNonPresentAttendance: vi.fn(), ShiftSessionError: class ShiftSessionError extends Error {}, startShiftSession: vi.fn(),
}));

import { authenticate } from '../../middleware/auth';
import { getJwtSecret } from '../../config/security';
import usersRouter from '../users';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/users', authenticate, usersRouter);
const adminToken = `Bearer ${jwt.sign({ id: 'admin-1', role: 'admin' }, getJwtSecret())}`;
const riderToken = `Bearer ${jwt.sign({ id: 'rider-1', role: 'rider' }, getJwtSecret())}`;

describe('daily attendance API shift data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolQuery.mockResolvedValue([[{
      rider_id: 'rider-1', rider_name: 'Riley', rider_email: 'riley@example.test',
      is_on_duty: 1,
      status: 'present', check_in_time: '2026-10-05 08:00:00', off_duty_time: null,
    }]]);
    getShiftSessionsForDate.mockResolvedValue({
      sessions: [{ id: 'shift-1', start_time: '2026-10-05 08:00:00', end_time: null, session_state: 'open' }],
      total_worked_minutes: 0,
    });
  });

  it('returns shift sessions for the requested Philippine work date', async () => {
    const response = await request(app).get('/api/users/attendance/daily?date=2026-10-05').set('Authorization', adminToken);

    expect(response.status).toBe(200);
    expect(getShiftSessionsForDate).toHaveBeenCalledWith(expect.anything(), 'rider-1', '2026-10-05');
    expect(response.body[0]).toMatchObject({
      rider_id: 'rider-1', is_on_duty: true, total_worked_minutes: 0,
      sessions: [{ start_time: '2026-10-05 08:00:00', end_time: null, session_state: 'open' }],
    });
  });

  it('includes automatic absence and administrator approval metadata', async () => {
    poolQuery.mockResolvedValueOnce([[{
      rider_id: 'rider-1', rider_name: 'Riley', rider_email: 'riley@example.test', is_on_duty: 0,
      status: 'absent', absence_source: 'automatic_no_show', auto_absent_at: '2026-10-05 08:15:00',
      late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-05 08:20:00',
      late_checkin_approved_by_name: 'Admin',
    }]]);

    const response = await request(app).get('/api/users/attendance/daily?date=2026-10-05').set('Authorization', adminToken);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      absence_source: 'automatic_no_show', auto_absent_at: '2026-10-05 08:15:00',
      late_checkin_approved_by: 'admin-1', late_checkin_approved_by_name: 'Admin',
    });
  });

  it('lets only admins approve a late check-in and emits confirmed attendance updates', async () => {
    const emit = vi.fn();
    app.set('io', { to: vi.fn(() => ({ emit })) });
    approveLateCheckIn.mockResolvedValue({ late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-22 08:20:00' });

    const unauthenticated = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval').send({ date: '2026-10-22' });
    const forbidden = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval')
      .set('Authorization', riderToken).send({ date: '2026-10-22' });
    const response = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval')
      .set('Authorization', adminToken).send({ date: '2026-10-22' });

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(approveLateCheckIn).toHaveBeenCalledWith(expect.anything(), { riderId: 'rider-1', date: '2026-10-22', adminId: 'admin-1' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, late_checkin_approved_by: 'admin-1' });
    expect(emit).toHaveBeenCalledWith('attendance-updated', { status: 'absent', late_checkin_approved: true, date: '2026-10-22' });
  });

  it('does not let admins clear an automatic no-show in place of explicit approval', async () => {
    poolQuery.mockResolvedValueOnce([[{ absence_source: 'automatic_no_show' }]]);

    const response = await request(app).delete('/api/users/attendance/rider-1').set('Authorization', adminToken);

    expect(response.status).toBe(409);
    expect(poolQuery).toHaveBeenCalledTimes(1);
  });
});
