import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../db', () => ({ pool: { query } }));

import authRoutes from '../auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

describe('refresh token lifecycle', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue([[{
      id: 'rider-1',
      email: 'rider@example.test',
      role: 'rider',
      department: null,
      refresh_token: 'refresh-token',
      refresh_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }], []]);
  });

  it('does not rotate the stored refresh token when restoring a session', async () => {
    const token = jwt.sign({ id: 'rider-1' }, 'fallback_refresh_secret_dev', { expiresIn: '1h' });
    query.mockResolvedValueOnce([[{
      id: 'rider-1',
      email: 'rider@example.test',
      role: 'rider',
      department: null,
      refresh_token: token,
      refresh_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }], []]);

    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${token}`);

    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain(`refreshToken=${token}`);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain('SELECT * FROM users');
    expect(query.mock.calls[1][0]).toContain('SELECT avatar_id FROM rider_avatar_preferences');
  });

  it('keeps a remembered cookie persistent during the final hours of its session', async () => {
    const token = jwt.sign({ id: 'rider-1', rememberMe: true }, 'fallback_refresh_secret_dev', { expiresIn: '1h' });
    query.mockResolvedValueOnce([[{
      id: 'rider-1',
      email: 'rider@example.test',
      role: 'rider',
      department: null,
      refresh_token: token,
      refresh_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }], []]);

    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${token}`);

    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain('Max-Age=');
  });

  it('revokes the current cookie refresh token on logout', async () => {
    const token = jwt.sign({ id: 'rider-1' }, 'fallback_refresh_secret_dev', { expiresIn: '1h' });

    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', `refreshToken=${token}`);

    expect(response.status).toBe(200);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain('refresh_token = NULL');
    expect(query.mock.calls[0][1]).toEqual(['rider-1', token]);
  });
});
