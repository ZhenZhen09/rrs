import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { loginSchema, signupSchema } from '../schemas/authSchema';
import argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { onlineRiders } from '../presence';

const router = Router();

// Runtime getter to ensure identical secret with middleware
const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_dev';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (match Refresh Token)
};

const generateTokens = async (user: any) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      department: user.department,
      is_on_duty: user.is_on_duty 
    },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    getRefreshSecret(),
    { expiresIn: '7d' }
  );

  // Store refresh token in DB for rotation and revocation
  await pool.query(
    'UPDATE users SET refresh_token = ?, refresh_token_expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?',
    [refreshToken, user.id]
  );

  return { accessToken, refreshToken };
};

// Login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
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
      return res.json({ 
        require_password_reset: true, 
        userId: user.id, 
        message: 'Must change password before proceeding' 
      });
    }

    // Check MFA status
    if (process.env.NODE_ENV !== 'development' && user.mfa_enabled) {
      return res.json({
        mfa_required: true,
        userId: user.id,
        message: 'Please enter your Google Authenticator code'
      });
    } else if (process.env.NODE_ENV !== 'development' && !isSuperAdmin && (user.role === 'personnel' || user.role === 'admin')) {
      return res.json({
        mfa_setup_required: true,
        userId: user.id,
        message: 'Security setup required: Please link your Google Authenticator'
      });
    }

    // Success: Generate Tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    // Set cookie (Secure, HttpOnly for Web)
    res.cookie('authToken', accessToken, COOKIE_OPTIONS);

    // Return user data
    const { password_hash, mfa_secret, refresh_token, refresh_token_expires_at, ...userProfile } = user;
    res.json({ ...userProfile, token: accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database or Internal server error' });
  }
});

// Refresh Token Endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body || {};
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
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    res.cookie('authToken', accessToken, COOKIE_OPTIONS);
    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body || {};
    if (userId) {
      await pool.query('UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ?', [userId]);

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
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// MFA: Verify and Enable
router.post('/mfa/setup-verify', async (req: Request, res: Response) => {
  try {
    const { userId, secret, token } = req.body || {};
    if (!userId || !secret || !token) {
      return res.status(400).json({ error: 'Missing required MFA fields' });
    }
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      await pool.query(
        'UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?',
        [secret, userId]
      );

      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      const user = (rows as any[])[0];
      const { accessToken, refreshToken } = await generateTokens(user);

      res.cookie('authToken', accessToken, COOKIE_OPTIONS);
      res.json({ success: true, user, token: accessToken, refreshToken });
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('MFA Setup Verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA setup' });
  }
});

// MFA: Verify Login
router.post('/mfa/verify-login', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body || {};
    if (!userId || !token) {
      return res.status(400).json({ error: 'Missing userId or token' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const users = rows as any[];
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    if (!user.mfa_secret) return res.status(400).json({ error: 'MFA not setup' });

    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      const { accessToken, refreshToken } = await generateTokens(user);
      res.cookie('authToken', accessToken, COOKIE_OPTIONS);
      res.json({ ...user, token: accessToken, refreshToken });
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

// Update Password
router.post('/update-password', async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body || {};
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Missing userId or newPassword' });
    }

    const hashedPassword = await argon2.hash(newPassword);
    
    await pool.query(
      'UPDATE users SET password_hash = ?, require_password_reset = 0, last_password_change = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
