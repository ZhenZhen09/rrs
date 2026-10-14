import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/security';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
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
    // Standard Security Practice: Explicitly enforce HS256 algorithm to prevent protocol confusion attacks
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as any;
    req.user = decoded;
    next();
  } catch (error) {
    const msg = (error as Error).message;
    const category = msg === 'jwt expired' ? 'expired' : 'invalid';
    console.warn(`[AUTH] Token verification failed (${category}) on ${req.method} ${req.path}`);

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
