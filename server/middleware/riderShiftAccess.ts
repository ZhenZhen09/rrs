import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { AuthRequest } from './auth';
import { reconcileRiderCutoff } from '../services/shiftCutoff';
import { getAutomaticShiftCloseSetting, getShiftPolicy } from '../services/shiftSchedule';

export async function getRiderShiftAccess(riderId: string, now: Date = new Date()) {
  const closed = await reconcileRiderCutoff(pool, riderId, now);
  let policy = await getShiftPolicy(pool, riderId, now);
  const [openRows]: any = await pool.query("SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='open' LIMIT 1", [riderId]);
  const hasOpenShift = Boolean(openRows[0]);
  const automaticShiftClose = await getAutomaticShiftCloseSetting(pool);
  if (!automaticShiftClose.enabled && hasOpenShift && policy.window === 'ended') {
    policy = { ...policy, canWork: true, nextStartAt: null };
  }
  return { closed, policy, locked: policy.active && !policy.canWork, hasOpenShift, automaticShiftClose };
}

export async function requireRiderWorkAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthRequest).user;
  if (user?.role !== 'rider') return next();
  try {
    const access = await getRiderShiftAccess(user.id);
    if (access.locked) {
      if (req.method === 'GET') {
        const match = /^\/([^/]+)(?:\/(?:status-history|timeline))?$/.exec(req.path);
        if (match && match[1] !== 'counts' && match[1] !== 'availability') {
          const [rows] = await pool.query('SELECT assigned_rider_id, status, delivery_status FROM delivery_requests WHERE request_id=?', [match[1]]);
          const job = (rows as any[])[0];
          if (job?.assigned_rider_id === user.id &&
            (['completed', 'delivered', 'failed', 'cancelled', 'disapproved'].includes(job.delivery_status)
              || ['cancelled', 'disapproved'].includes(job.status))) return next();
        }
      }
      return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', error: 'Shift hours have ended for today.', next_start_at: access.policy.nextStartAt });
    }
    next();
  } catch (error) {
    console.error('Rider shift access check failed:', error);
    res.status(503).json({ error: 'Unable to verify shift hours' });
  }
}
