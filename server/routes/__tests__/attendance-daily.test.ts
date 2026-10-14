import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, getShiftSessionsForDate } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getShiftSessionsForDate: vi.fn(),
}));
vi.mock('../../db', () => ({ pool: { query: poolQuery, getConnection: vi.fn() } }));
vi.mock('../../presence', () => ({ onlineRiders: new Map() }));
vi.mock('../../locationTracking', () => ({ handleRiderLocationUpdate: vi.fn() }));
vi.mock('../../services/connectivityLogger', () => ({ recordConnectivityLog: vi.fn() }));
vi.mock('../../services/locationEventReceipts', () => ({ ensureLocationEventReceiptsTable: vi.fn() }));
vi.mock('../../services/shiftSessions', () => ({
  endShiftSession: vi.fn(), getCurrentShiftSession: vi.fn(), getShiftSessionsForDate,
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

describe('daily attendance API shift data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolQuery.mockResolvedValue([[{
      rider_id: 'rider-1', rider_name: 'Riley', rider_email: 'riley@example.test',
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
      rider_id: 'rider-1', total_worked_minutes: 0,
      sessions: [{ start_time: '2026-10-05 08:00:00', end_time: null, session_state: 'open' }],
    });
  });
});
