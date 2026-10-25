import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { loginSchema, signupSchema } from '../schemas/authSchema';
import argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { onlineRiders } from '../presence';
import { getRememberMe } from './authSession';
import { consumeAuthChallenge, findAuthChallenge, issueAuthChallenge } from '../services/authChallenges';
import { getJwtSecret, getRefreshSecret } from '../config/security';
import { getDefaultRiderAvatarId } from '../services/riderAvatarCatalog';
import { getRiderAvatarPreference } from '../services/riderAvatarPreferences';

const router = Router();

const ACCESS_TOKEN_TTL = '1h';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const REMEMBERED_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  ...(maxAge === undefined ? {} : { maxAge })
});

const getSessionTtl = (rememberMe: boolean) => rememberMe ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS;
const isMobileClient = (req: Request) => req.headers['x-client-type'] === 'mobile';
const resetRiderDutyAtLogin = async (user: any, req: Request) => {
  if (user.role !== 'rider') return;
  await pool.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [user.id]);
  user.is_on_duty = false;
  req.app.get('io')?.to('admin-room').emit('rider-status-updated', { riderId: user.id, riderName: user.name, type: 'duty', is_on_duty: false });
};
const toUserProfile = async (user: any) => {
  const { password_hash, mfa_secret, refresh_token, refresh_token_expires_at, ...profile } = user;
  const avatarId = profile.role === 'rider'
    ? await getRiderAvatarPreference(String(profile.id))
    : null;
  return { ...profile, avatar_id: avatarId || getDefaultRiderAvatarId(String(profile.id)) };
};

const generateAccessToken = (user: any) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role,
    department: user.department,
    is_on_duty: user.is_on_duty,
  },
  getJwtSecret(),
  { expiresIn: ACCESS_TOKEN_TTL }
);

const generateTokens = async (user: any, rememberMe: boolean, existingRefreshExpiresAt?: Date) => {
  const refreshExpiresAt = existingRefreshExpiresAt || new Date(Date.now() + getSessionTtl(rememberMe));
  const refreshTtlSeconds = Math.max(1, Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000));
  const refreshExpiresAtSql = refreshExpiresAt
    .toISOString().slice(0, 19).replace('T', ' ');
  const accessToken = generateAccessToken(user);

  const refreshToken = jwt.sign(
    { id: user.id, rememberMe },
    getRefreshSecret(),
    { expiresIn: refreshTtlSeconds }
  );

  // Store refresh token in DB for rotation and revocation
  await pool.query(
    'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?',
    [refreshToken, refreshExpiresAtSql, user.id]
  );

  return { accessToken, refreshToken };
};

// Login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe: requestedRememberMe = false } = req.body || {};
    const rememberMe = getRememberMe(req, requestedRememberMe);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const isSuperAdmin = email.toLowerCase() === 'admin@company.com';
    
    console.log('Login attempt for email:', email);
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const users = rows as any[];
    
    if (users.length === 0) {
      console.log('No user found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify hashed password
    const isPasswordValid = await argon2.verify(user.password_hash, password);
    if (!isPasswordValid) {
      console.log('Invalid password for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // SPECIAL POWER: admin@company.com is ALWAYS active
    if (!isSuperAdmin && user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // SPECIAL POWER: admin@company.com BYPASSES mandatory reset
    if (!isSuperAdmin && user.require_password_reset) {
      const challenge = await issueAuthChallenge(user.id, 'password_reset');
      return res.json({ 
        require_password_reset: true, 
        challenge,
        role: user.role,
        message: 'Must change password before proceeding' 
      });
    }

    // Check MFA status
    if (!isSuperAdmin && process.env.NODE_ENV !== 'development' && user.mfa_enabled) {
      return res.json({
        mfa_required: true,
        challenge: await issueAuthChallenge(user.id, 'mfa_login'),
        message: 'Please enter your Google Authenticator code'
      });
    } else if (process.env.NODE_ENV !== 'development' && !isSuperAdmin && (user.role === 'personnel' || user.role === 'admin')) {
      return res.json({
        mfa_setup_required: true,
        challenge: await issueAuthChallenge(user.id, 'mfa_setup'),
        message: 'Security setup required: Please link your Google Authenticator'
      });
    }

    // A fresh rider login starts connected but off duty.
    await resetRiderDutyAtLogin(user, req);
    // Success: Generate Tokens
    const { accessToken, refreshToken } = await generateTokens(user, rememberMe);

    // Set cookie (Secure, HttpOnly for Web)
    const sessionCookieAge = rememberMe ? REMEMBERED_SESSION_TTL_MS : undefined;
    res.cookie('authToken', accessToken, getCookieOptions(sessionCookieAge));
    res.cookie('refreshToken', refreshToken, getCookieOptions(sessionCookieAge));

    // Return user data
    const userProfile = await toUserProfile(user);
    res.json(isMobileClient(req) ? { ...userProfile, token: accessToken, refreshToken } : userProfile);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database or Internal server error' });
  }
});

// Refresh Token Endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, getRefreshSecret()) as any;
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND refresh_token = ? AND refresh_token_expires_at > NOW()',
      [decoded.id, refreshToken]
    );
    const users = rows as any[];

    if (users.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const user = users[0];
    const remainingSessionMs = Math.max(0, new Date(user.refresh_token_expires_at).getTime() - Date.now());
    const rememberMe = typeof decoded.rememberMe === 'boolean'
      ? decoded.rememberMe
      : remainingSessionMs > SESSION_TTL_MS;
    // Keep the refresh credential stable until its fixed expiry. Rotating a
    // single per-user token here makes simultaneous tabs invalidate each other.
    const accessToken = generateAccessToken(user);
    const currentRefreshToken = refreshToken;

    const sessionCookieAge = rememberMe ? remainingSessionMs : undefined;
    res.cookie('authToken', accessToken, getCookieOptions(sessionCookieAge));
    res.cookie('refreshToken', currentRefreshToken, getCookieOptions(sessionCookieAge));
    const userProfile = await toUserProfile(user);
    res.json(isMobileClient(req)
      ? { ...userProfile, token: accessToken, refreshToken: currentRefreshToken }
      : userProfile);
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    let { userId } = req.body || {};
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, getRefreshSecret()) as any;
      } catch {
        // Clearing an expired or malformed cookie should still complete logout.
      }
      if (decoded?.id) {
        userId = decoded.id;
        await pool.query(
          'UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ? AND refresh_token = ?',
          [decoded.id, refreshToken]
        );
      } else {
        userId = undefined;
      }
    }
    if (userId) {
      if (!refreshToken) {
        await pool.query('UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ?', [userId]);
      }

      if (onlineRiders.has(userId)) {
        onlineRiders.delete(userId);
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('rider-presence-changed', { 
            riderId: userId, 
            status: 'offline',
            reason: 'logout'
          });
        }
      }
    }
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Start MFA enrollment after the password was verified by /login.
router.post('/mfa/setup-init', async (req: Request, res: Response) => {
  try {
    const { challenge: setupChallenge } = req.body || {};
    if (!setupChallenge) return res.status(401).json({ error: 'Authentication challenge required' });

    const pendingSetup = await findAuthChallenge(setupChallenge, 'mfa_setup');
    if (!pendingSetup) return res.status(401).json({ error: 'Invalid or expired MFA setup challenge' });

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [pendingSetup.userId]);
    const user = (rows as any[])[0];
    if (!user || user.mfa_enabled || user.status === 'inactive' || user.email?.toLowerCase() === 'admin@company.com') {
      return res.status(403).json({ error: 'Account is not eligible for MFA setup' });
    }
    if (!['admin', 'personnel'].includes(user.role)) {
      return res.status(403).json({ error: 'MFA setup is not available for this account' });
    }
    if (!await consumeAuthChallenge(setupChallenge, 'mfa_setup')) {
      return res.status(401).json({ error: 'Invalid or expired MFA setup challenge' });
    }

    const secret = speakeasy.generateSecret({ name: `Errands (${user.email})` });
    const challenge = await issueAuthChallenge(user.id, 'mfa_setup_verify', { secret: secret.base32 });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return res.json({ challenge, qrCode });
  } catch (error) {
    console.error('MFA Setup initialization error:', error);
    return res.status(500).json({ error: 'Failed to initialize MFA setup' });
  }
});

// Verify and enable MFA using the server-issued enrollment challenge.
router.post('/mfa/setup-verify', async (req: Request, res: Response) => {
  try {
    const { challenge: setupChallenge, token, rememberMe: requestedRememberMe = false } = req.body || {};
    const rememberMe = getRememberMe(req, requestedRememberMe);
    if (!setupChallenge || !token) return res.status(401).json({ error: 'Authentication challenge required' });

    const pendingSetup = await findAuthChallenge(setupChallenge, 'mfa_setup_verify');
    if (!pendingSetup || typeof pendingSetup.payload.secret !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired MFA setup challenge' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND (mfa_enabled = 0 OR mfa_enabled IS NULL)',
      [pendingSetup.userId],
    );
    const user = (rows as any[])[0];
    if (!user || user.status === 'inactive' || user.email?.toLowerCase() === 'admin@company.com') {
      return res.status(403).json({ error: 'Account is not eligible for MFA setup' });
    }
    const verified = speakeasy.totp.verify({
      secret: pendingSetup.payload.secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      if (!await consumeAuthChallenge(setupChallenge, 'mfa_setup_verify')) {
        return res.status(401).json({ error: 'Invalid or expired MFA setup challenge' });
      }
      const [updateResult] = await pool.query(
        'UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ? AND (mfa_enabled = 0 OR mfa_enabled IS NULL)',
        [pendingSetup.payload.secret, pendingSetup.userId],
      ) as any[];
      if (updateResult?.affectedRows !== 1) {
        return res.status(409).json({ error: 'MFA is already enabled for this account' });
      }
      user.mfa_secret = pendingSetup.payload.secret;
      user.mfa_enabled = 1;
      const { accessToken, refreshToken } = await generateTokens(user, rememberMe);
      const sessionCookieAge = rememberMe ? REMEMBERED_SESSION_TTL_MS : undefined;
      res.cookie('authToken', accessToken, getCookieOptions(sessionCookieAge));
      res.cookie('refreshToken', refreshToken, getCookieOptions(sessionCookieAge));
      const userProfile = await toUserProfile(user);
      res.json(isMobileClient(req) ? { success: true, user: userProfile, token: accessToken, refreshToken } : { success: true, user: userProfile });
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('MFA Setup Verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA setup' });
  }
});

// Complete MFA login using the challenge issued after password verification.
router.post('/mfa/verify-login', async (req: Request, res: Response) => {
  try {
    const { challenge: loginChallenge, token, rememberMe: requestedRememberMe = false } = req.body || {};
    const rememberMe = getRememberMe(req, requestedRememberMe);
    if (!loginChallenge || !token) return res.status(401).json({ error: 'Authentication challenge required' });

    const pendingLogin = await findAuthChallenge(loginChallenge, 'mfa_login');
    if (!pendingLogin) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [pendingLogin.userId]);
    const users = rows as any[];
    if (users.length === 0) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });

    const user = users[0];
    if (user.status === 'inactive' || !user.mfa_enabled || !user.mfa_secret) {
      return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      if (!await consumeAuthChallenge(loginChallenge, 'mfa_login')) {
        return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
      }
      await resetRiderDutyAtLogin(user, req);
      const { accessToken, refreshToken } = await generateTokens(user, rememberMe);
      const sessionCookieAge = rememberMe ? REMEMBERED_SESSION_TTL_MS : undefined;
      res.cookie('authToken', accessToken, getCookieOptions(sessionCookieAge));
      res.cookie('refreshToken', refreshToken, getCookieOptions(sessionCookieAge));
      const userProfile = await toUserProfile(user);
      res.json(isMobileClient(req) ? { ...userProfile, token: accessToken, refreshToken } : userProfile);
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('MFA Login Verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

// Signup
router.post('/signup', validate(signupSchema), async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    const hashedPassword = await argon2.hash(password);
    const id = `user_${Date.now()}`;
    const name = email?.split('@')[0] || 'User';
    const department = role === 'personnel' ? 'Operations' : null;
    
    await pool.query(
      'INSERT INTO users (id, email, name, role, department, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, name, role, department, hashedPassword]
    );

    const [rows] = await pool.query('SELECT id, email, name, role, department FROM users WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Email exists or db error' });
  }
});

// Complete a forced password change using the challenge issued after password verification.
router.post('/update-password', async (req: Request, res: Response) => {
  try {
    const { challenge: resetChallenge, newPassword } = req.body || {};
    if (!resetChallenge || typeof newPassword !== 'string') {
      return res.status(401).json({ error: 'Password reset challenge required' });
    }

    const pendingReset = await findAuthChallenge(resetChallenge, 'password_reset');
    if (!pendingReset) return res.status(401).json({ error: 'Invalid or expired password reset challenge' });
    const [rows] = await pool.query(
      'SELECT id, email, role, require_password_reset FROM users WHERE id = ?',
      [pendingReset.userId],
    );
    const user = (rows as any[])[0];
    if (!user || !user.require_password_reset || user.email?.toLowerCase() === 'admin@company.com') {
      return res.status(401).json({ error: 'Invalid or expired password reset challenge' });
    }

    const isValidPassword = user.role === 'rider'
      ? /^\d{4}$/.test(newPassword)
      : newPassword.length >= 8 && /\d/.test(newPassword) && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!isValidPassword) return res.status(400).json({ error: 'New password does not meet the account password requirements' });

    if (!await consumeAuthChallenge(resetChallenge, 'password_reset')) {
      return res.status(401).json({ error: 'Invalid or expired password reset challenge' });
    }

    const hashedPassword = await argon2.hash(newPassword);
    
    const [updateResult] = await pool.query(
      `UPDATE users SET password_hash = ?, require_password_reset = 0, last_password_change = CURRENT_TIMESTAMP,
         refresh_token = NULL, refresh_token_expires_at = NULL
       WHERE id = ? AND require_password_reset = 1`,
      [hashedPassword, pendingReset.userId],
    ) as any[];
    if (updateResult?.affectedRows !== 1) return res.status(401).json({ error: 'Password reset is no longer required' });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
