import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import * as argon2 from 'argon2';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, email, name, role, department, status, created_at, updated_at, last_password_change, require_password_reset, mfa_enabled FROM users");
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Manual MFA reset
router.post('/:id/reset-mfa', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result]: any = await pool.query(
      'UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'MFA reset successfully' });
  } catch (error) {
    console.error('MFA reset error:', error);
    res.status(500).json({ error: 'Failed to reset MFA' });
  }
});


// Get all riders
router.get('/riders', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'rider'");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user push subscription
router.put('/:id/push-subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscription } = req.body;

    await pool.query(
      'UPDATE users SET push_subscription = ? WHERE id = ?',
      [JSON.stringify(subscription), id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Unified update for role, dept, status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, department, status } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];

    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const [result]: any = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Manual account provisioning
router.post('/', async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a secure 12-character temporary password
    const tempPassword = crypto.randomBytes(9).toString('base64');
    const hashedPassword = await argon2.hash(tempPassword);
    
    // Generate a unique ID based on the role
    const userId = `${role}_${crypto.randomBytes(4).toString('hex')}`;

    await pool.query(
      'INSERT INTO users (id, email, name, role, department, password_hash, require_password_reset, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, name, role, department || null, hashedPassword, true, 'active']
    );

    res.status(201).json({ 
      success: true, 
      user: { id: userId, name, email, role, department, status: 'active' },
      tempPassword 
    });
  } catch (error) {
    console.error('Provisioning error:', error);
    res.status(500).json({ error: 'Failed to provision user' });
  }
});

// Manual password reset
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tempPassword = crypto.randomBytes(12).toString('base64');
    const hashedPassword = await argon2.hash(tempPassword);

    const [result]: any = await pool.query(
      'UPDATE users SET password_hash = ?, require_password_reset = ? WHERE id = ?',
      [hashedPassword, true, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, tempPassword });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
