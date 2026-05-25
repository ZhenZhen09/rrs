import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AuthRequest } from './auth';

/**
 * Idempotency Middleware (Enterprise Hardening Slice 1.3)
 * 
 * Ensures that requests with the same 'Idempotency-Key' are only processed once.
 * Subsequent requests with the same key will receive the cached response.
 * 
 * Works for POST and PUT requests.
 */
export const idempotency = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const key = req.headers['idempotency-key'] as string;

  // Skip if no key or not a mutating method
  if (!key || (req.method !== 'POST' && req.method !== 'PUT')) {
    return next();
  }

  const userId = req.user?.id;
  if (!userId) {
    // If not authenticated yet, we can't reliably scope the key to a user.
    // However, usually idempotency runs after auth.
    return next();
  }

  try {
    // 1. Check for existing response
    const [rows]: any = await pool.query(
      'SELECT response_code, response_body FROM idempotency_keys WHERE idempotency_key = ? AND user_id = ? AND expires_at > NOW()',
      [key, userId]
    );

    if (rows && rows.length > 0) {
      console.log(`[IDEMPOTENCY] Cache hit for key: ${key}`);
      const { response_code, response_body } = rows[0];
      return res.status(response_code).json(response_body);
    }

    // 2. Intercept the response to cache it
    const originalJson = res.json;
    res.json = (body: any) => {
      // Only cache successful or client-error responses (not 500s usually)
      if (res.statusCode >= 200 && res.statusCode < 500) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

        pool.query(
          'INSERT IGNORE INTO idempotency_keys (idempotency_key, user_id, response_code, response_body, expires_at) VALUES (?, ?, ?, ?, ?)',
          [key, userId, res.statusCode, JSON.stringify(body), expiresAt]
        ).catch(err => {
          console.error('[IDEMPOTENCY] Failed to cache response:', err);
        });
      }

      return originalJson.call(res, body);
    };

    next();
  } catch (err) {
    console.error('[IDEMPOTENCY] Middleware error:', err);
    next(); // Proceed anyway to avoid blocking the user
  }
};
