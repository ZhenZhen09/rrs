import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { loginSchema, signupSchema } from '../schemas/authSchema';
import * as argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

const router = Router();

// Login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const isSuperAdmin = email.toLowerCase() === 'admin@company.com';
  
  console.log('Login attempt for email:', email);
  try {
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
    if (user.mfa_enabled) {
      // MFA is enabled, require second factor
      return res.json({
        mfa_required: true,
        userId: user.id,
        message: 'Please enter your Google Authenticator code'
      });
    } else if (!isSuperAdmin && (user.role === 'personnel' || user.role === 'admin')) {
      // MFA is NOT enabled but required for these roles (Self-provisioning flow)
      return res.json({
        mfa_setup_required: true,
        userId: user.id,
        message: 'Security setup required: Please link your Google Authenticator'
      });
    }

    // Success: Return user data (omit sensitive fields)
    const { password_hash, mfa_secret, ...userProfile } = user;
    res.json(userProfile);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// MFA: Initialize Setup
router.post('/mfa/setup-init', async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    const [rows] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    const users = rows as any[];
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    const secret = speakeasy.generateSecret({
      name: `RiderSystem (${user.email})`
    });

    // We store the secret temporarily or just send it to client for verification
    // For simplicity, we send it to client, and they'll send it back with the first code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('MFA Setup Init error:', error);
    res.status(500).json({ error: 'Failed to initialize MFA setup' });
  }
});

// MFA: Verify and Enable
router.post('/mfa/setup-verify', async (req: Request, res: Response) => {
  const { userId, secret, token } = req.body;
  try {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      // Enable MFA for this user
      await pool.query(
        'UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?',
        [secret, userId]
      );

      // Return the full user profile to log them in
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      const { password_hash, mfa_secret, ...userProfile } = (rows as any[])[0];
      res.json({ success: true, user: userProfile });
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
  const { userId, token } = req.body;
  try {
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
      const { password_hash, mfa_secret, ...userProfile } = user;
      res.json(userProfile);
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
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await argon2.hash(password);
    const id = `user_${Date.now()}`;
    const name = email.split('@')[0];
    const department = role === 'personnel' ? 'Operations' : null;
    
    await pool.query(
      'INSERT INTO users (id, email, name, role, department, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, name, role, department, hashedPassword]
    );

    const [rows] = await pool.query('SELECT id, email, name, role, department FROM users WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Email exists or db error' });
  }
});

// Update Password (Self-service/Reset)
router.post('/update-password', async (req: Request, res: Response) => {
  const { userId, newPassword } = req.body;
  try {
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Missing userId or newPassword' });
    }

    const hashedPassword = await argon2.hash(newPassword);
    
    // Update the password, clear the reset requirement, and record the timestamp
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
