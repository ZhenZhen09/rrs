import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const { query, authChallenges } = vi.hoisted(() => ({
  query: vi.fn(),
  authChallenges: {
    issueAuthChallenge: vi.fn(),
    findAuthChallenge: vi.fn(),
    consumeAuthChallenge: vi.fn(),
  },
}));
vi.mock('../../db', () => ({ pool: { query } }));
vi.mock('../../services/authChallenges', () => authChallenges);
vi.mock('argon2', () => ({ default: {
  hash: vi.fn().mockResolvedValue('hashed-password'),
  verify: vi.fn().mockResolvedValue(true),
} }));
vi.mock('speakeasy', () => ({
  totp: { verify: vi.fn().mockReturnValue(true) },
  generateSecret: vi.fn().mockReturnValue({ base32: 'SERVER-GENERATED-SECRET', otpauth_url: 'otpauth://test' }),
}));
vi.mock('qrcode', () => ({ toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') }));
vi.mock('../../presence', () => ({ onlineRiders: new Map() }));

import authRoutes from '../auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('auth security boundaries', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue([[], []]);
    vi.mocked(authChallenges.issueAuthChallenge).mockReset().mockResolvedValue('opaque-test-challenge');
    vi.mocked(authChallenges.findAuthChallenge).mockReset().mockResolvedValue(null);
    vi.mocked(authChallenges.consumeAuthChallenge).mockReset().mockResolvedValue(false);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('rejects public self-registration for the admin role', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: 'attacker@example.test',
      password: 'Example123!',
      role: 'admin',
    });

    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['personnel', 'rider'])('keeps public signup available for the %s role', async (role) => {
    const createdUser = {
      id: 'user-new',
      email: `${role}@example.test`,
      name: role,
      role,
      department: role === 'personnel' ? 'Operations' : null,
    };
    query.mockResolvedValueOnce([[], []]).mockResolvedValueOnce([[createdUser], []]);

    const response = await request(app).post('/api/auth/signup').send({
      email: createdUser.email,
      password: 'Example123!',
      role,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(createdUser);
  });

  it('does not let an unauthenticated caller enroll an MFA factor for an arbitrary account', async () => {
    query
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[{
        id: 'admin_001',
        email: 'admin@example.test',
        role: 'admin',
        department: null,
        mfa_enabled: true,
        mfa_secret: 'existing-secret',
      }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const response = await request(app).post('/api/auth/mfa/setup-verify').send({
      userId: 'admin_001',
      secret: 'JBSWY3DPEHPK3PXP',
      token: '123456',
    });

    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('does not let an unauthenticated caller change an arbitrary account password', async () => {
    const response = await request(app).post('/api/auth/update-password').send({
      userId: 'admin_001',
      newPassword: 'NewSecure123!',
    });

    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('does not let a caller choose the account ID for MFA login', async () => {
    const response = await request(app).post('/api/auth/mfa/verify-login').send({
      userId: 'admin_001',
      token: '123456',
    });

    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires a password-verified challenge to initialize MFA setup', async () => {
    const response = await request(app).post('/api/auth/mfa/setup-init').send({ userId: 'personnel-1' });

    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('issues an MFA login challenge only after password verification', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    query.mockResolvedValueOnce([[{
      id: 'rider-1', email: 'rider@example.test', role: 'rider', password_hash: 'hash', mfa_enabled: true,
    }], []]);

    const response = await request(app).post('/api/auth/login').send({ email: 'rider@example.test', password: 'correct' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ mfa_required: true, challenge: 'opaque-test-challenge' });
    expect(response.body.userId).toBeUndefined();
    expect(authChallenges.issueAuthChallenge).toHaveBeenCalledOnce();
    expect(authChallenges.issueAuthChallenge).toHaveBeenCalledWith('rider-1', 'mfa_login');
  });

  it('keeps the sole admin account login behavior and stored credentials untouched', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'test-access-secret-that-is-longer-than-32-chars');
    vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-that-is-longer-than-32-chars');
    query
      .mockResolvedValueOnce([[{
        id: 'admin_001', email: 'admin@company.com', role: 'admin', password_hash: 'existing-hash',
        status: 'inactive', require_password_reset: true, mfa_enabled: true, mfa_secret: 'existing-mfa-secret',
      }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@company.com',
      password: 'unchanged-admin-password',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'admin_001', email: 'admin@company.com', role: 'admin' });
    expect(response.body.mfa_required).toBeUndefined();
    expect(response.body.require_password_reset).toBe(true);
    expect(authChallenges.issueAuthChallenge).not.toHaveBeenCalled();
    expect(query.mock.calls[1][1][2]).toBe('admin_001');
    expect(query.mock.calls.some(([sql]) => String(sql).includes('mfa_secret = NULL'))).toBe(false);
  });

  it('reserves the sole administrator email from public self-registration', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: 'ADMIN@COMPANY.COM',
      password: 'Example123!',
      role: 'rider',
    });
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});
