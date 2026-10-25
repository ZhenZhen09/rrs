import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../db', () => ({ pool: { query } }));
vi.mock('fs', () => ({ default: { appendFileSync: vi.fn() } }));
vi.mock('../../presence', () => ({ onlineRiders: new Map() }));
vi.mock('../../locationTracking', () => ({ handleRiderLocationUpdate: vi.fn() }));
vi.mock('../../services/connectivityLogger', () => ({ recordConnectivityLog: vi.fn() }));
vi.mock('../../services/locationEventReceipts', () => ({ ensureLocationEventReceiptsTable: vi.fn() }));

import { authenticate } from '../../middleware/auth';
import { getJwtSecret } from '../../config/security';
import usersRouter from '../users';
import authRouter from '../auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.set('io', { to: vi.fn(() => ({ emit: vi.fn() })) });
app.use('/api/users', authenticate, usersRouter);
app.use('/api/auth', authRouter);

const tokenFor = (id: string, role: string) => `Bearer ${jwt.sign({ id, role }, getJwtSecret())}`;

describe('rider avatar profile API', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue([{ affectedRows: 1 }, []]);
  });

  it('persists the authenticated rider avatar in the preference table', async () => {
    const response = await request(app).patch('/api/users/me/avatar')
      .set('Authorization', tokenFor('rider-1', 'rider'))
      .send({ avatar_id: 'avatar_03', user_id: 'rider-2' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ avatar_id: 'avatar_03' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO rider_avatar_preferences'), ['rider-1', 'avatar_03']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS rider_avatar_preferences'));
  });

  it('rejects an unknown avatar ID without writing', async () => {
    const response = await request(app).patch('/api/users/me/avatar')
      .set('Authorization', tokenFor('rider-1', 'rider'))
      .send({ avatar_id: 'https://example.test/photo.png' });

    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('denies a non-rider before writing', async () => {
    const response = await request(app).patch('/api/users/me/avatar')
      .set('Authorization', tokenFor('admin-1', 'admin'))
      .send({ avatar_id: 'avatar_03' });

    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires authentication before writing', async () => {
    const response = await request(app).patch('/api/users/me/avatar').send({ avatar_id: 'avatar_03' });
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('loads admin and rider lists without requiring a users.avatar_id column', async () => {
    const legacy = { id: 'rider-1', name: 'Riley', email: 'riley@example.test', role: 'rider' };
    query.mockImplementation(async (sql: string) => {
      if (/u\.avatar_id/i.test(sql)) throw new Error("Unknown column 'u.avatar_id' in 'field list'");
      return [[{ ...legacy, saved_avatar_id: null }], []];
    });

    const all = await request(app).get('/api/users').set('Authorization', tokenFor('admin-1', 'admin'));
    const riders = await request(app).get('/api/users/riders').set('Authorization', tokenFor('admin-1', 'admin'));

    expect(all.status).toBe(200);
    expect(riders.status).toBe(200);
    expect(all.body[0]).toMatchObject({ ...legacy, avatar_id: 'avatar_05' });
    expect(riders.body[0]).toMatchObject({ ...legacy, avatar_id: 'avatar_05' });
    expect(query.mock.calls.every(([sql]) => !/u\.avatar_id/i.test(String(sql)))).toBe(true);
  });

  it('loads live riders without requiring a users.avatar_id column', async () => {
    query.mockImplementation(async (sql: string) => {
      if (/rap\.user_id\s*=\s*u\.id/i.test(sql)) throw new Error('Illegal mix of collations for operation =');
      if (/u\.avatar_id/i.test(sql)) throw new Error("Unknown column 'u.avatar_id' in 'field list'");
      return [[{ id: 'rider-1', name: 'Riley', saved_avatar_id: 'avatar_03' }], []];
    });
    const response = await request(app).get('/api/users/riders/live').set('Authorization', tokenFor('admin-1', 'admin'));
    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ id: 'rider-1', name: 'Riley', avatar_id: 'avatar_03' });
    expect(query.mock.calls.some(([sql]) => /user_id\s+COLLATE\s+utf8mb4_general_ci\s*=\s*u\.id\s+COLLATE\s+utf8mb4_general_ci/i.test(String(sql)))).toBe(true);
    expect(query.mock.calls.every(([sql]) => !/u\.avatar_id/i.test(String(sql)))).toBe(true);
  });

  it('returns null for a legacy rider login profile', async () => {
    const password_hash = await argon2.hash('1234');
    query.mockImplementation(async (sql: string) => sql.startsWith('SELECT * FROM users WHERE email')
      ? [[{ id: 'rider-1', email: 'riley@example.test', name: 'Riley', role: 'rider', password_hash, avatar_id: null }], []]
      : [{ affectedRows: 1 }, []]);

    const response = await request(app).post('/api/auth/login')
      .send({ email: 'riley@example.test', password: '1234' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'rider-1', name: 'Riley', avatar_id: 'avatar_05' });
    expect(response.body.password_hash).toBeUndefined();
    expect(response.body.is_on_duty).toBe(false);
    expect(query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = FALSE WHERE id = ?', ['rider-1']);
  });

  it('returns the saved rider avatar on login instead of replacing it with the generated default', async () => {
    const password_hash = await argon2.hash('1234');
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM users WHERE email')) {
        return [[{ id: 'rider-1', email: 'riley@example.test', name: 'Riley', role: 'rider', password_hash }], []];
      }
      if (sql.includes('FROM rider_avatar_preferences')) return [[{ avatar_id: 'avatar_03' }], []];
      return [{ affectedRows: 1 }, []];
    });

    const response = await request(app).post('/api/auth/login')
      .send({ email: 'riley@example.test', password: '1234' });

    expect(response.status).toBe(200);
    expect(response.body.avatar_id).toBe('avatar_03');
  });

  it('normalizes an omitted avatar column in a legacy login row to null', async () => {
    const password_hash = await argon2.hash('1234');
    query.mockImplementation(async (sql: string) => sql.startsWith('SELECT * FROM users WHERE email')
      ? [[{ id: 'rider-1', email: 'riley@example.test', name: 'Riley', role: 'rider', password_hash }], []]
      : [{ affectedRows: 1 }, []]);

    const response = await request(app).post('/api/auth/login')
      .send({ email: 'riley@example.test', password: '1234' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'rider-1', name: 'Riley', avatar_id: 'avatar_05' });
  });
});

describe('rider avatar migration', () => {
  it('adds a nullable avatar column once and preserves existing user rows on rerun', async () => {
    const { migrate } = require('../../../scripts/migrate-rider-avatar-id.cjs');
    let columnExists = false;
    const db = { query: vi.fn(async (sql: string) => {
      if (sql.includes('information_schema.COLUMNS')) return [columnExists ? [{ 1: 1 }] : [], []];
      if (sql.startsWith('ALTER TABLE users')) { columnExists = true; return [{ affectedRows: 0 }, []]; }
      throw new Error(`Unexpected SQL: ${sql}`);
    }) };

    await migrate(db);
    await migrate(db);

    const statements = db.query.mock.calls.map(([sql]: [string]) => sql);
    expect(statements.filter((sql: string) => sql.startsWith('ALTER TABLE users'))).toEqual([
      'ALTER TABLE users ADD COLUMN avatar_id VARCHAR(32) NULL',
    ]);
    expect(statements).toHaveLength(3);
  });
});
