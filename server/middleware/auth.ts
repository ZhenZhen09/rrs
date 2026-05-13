import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Security: Evaluate secret at runtime to avoid import-order/env-load race conditions
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('⚠️ [AUTH] JWT_SECRET is missing from environment! Using fallback.');
  }
  return secret || 'fallback_secret_for_dev_only';
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    department?: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check cookie first, then header
  const token = req.cookies.authToken || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Access denied. No valid token provided.' });
  }

  // Handle accidental "rider-session-token" placeholder from old app versions
  if (token === 'rider-session-token') {
    return res.status(401).json({ error: 'Legacy session detected. Please log out and log in again.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    req.user = decoded;
    next();
  } catch (error) {
    const msg = (error as Error).message;
    console.error('[AUTH] Token verification failed:', msg);
    
    // Log to file for deep debugging
    try {
      fs.appendFileSync('api_debug.log', `[AUTH ERROR ${new Date().toISOString()}] ${msg} | Path: ${req.originalUrl} | Client: ${req.headers['x-client-type']} | Token Start: ${token.substring(0, 10)}...\n`);
    } catch (e) {}

    if (msg === 'jwt expired') {
      return res.status(401).json({ error: 'jwt expired', code: 'TOKEN_EXPIRED' });
    }

    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
