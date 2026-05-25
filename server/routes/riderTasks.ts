import { Router, Response } from 'express';
import { pool } from '../db';
import { AuthRequest, authorize } from '../middleware/auth';

const router = Router();

const TERMINAL_STATUSES = ['completed', 'delivered', 'failed', 'cancelled'];

const formatRequestRow = (row: any) => ({
  ...row,
  delivery_date: row.delivery_date instanceof Date
    ? row.delivery_date.toISOString().split('T')[0]
    : (typeof row.delivery_date === 'string' ? row.delivery_date.split('T')[0] : row.delivery_date),
  pickup_location: {
    lat: row.pickup_lat,
    lng: row.pickup_lng,
    address: row.pickup_address,
    businessName: row.pickup_business_name,
    landmarks: row.pickup_landmarks,
  },
  dropoff_location: {
    lat: row.dropoff_lat,
    lng: row.dropoff_lng,
    address: row.dropoff_address,
    businessName: row.dropoff_business_name,
    landmarks: row.dropoff_landmarks,
  },
  current_location: row.current_lat !== null && row.current_lat !== undefined && row.current_lng !== null && row.current_lng !== undefined
    ? { lat: row.current_lat, lng: row.current_lng }
    : null,
  exceptions: row.exceptions ? (typeof row.exceptions === 'string' ? JSON.parse(row.exceptions) : row.exceptions) : [],
});

router.get('/active', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const [rows] = await pool.query(`
      SELECT *
      FROM delivery_requests
      WHERE assigned_rider_id = ?
        AND status = 'approved'
        AND delivery_status NOT IN (?, ?, ?, ?)
      ORDER BY delivery_date ASC, time_window ASC, created_at DESC
    `, [user.id, ...TERMINAL_STATUSES]);

    res.json({ data: (rows as any[]).map(formatRequestRow) });
  } catch (error) {
    console.error('Fetch rider active tasks error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/history', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const offset = (page - 1) * limit;

    const terminalDeliveryPlaceholders = TERMINAL_STATUSES.map(() => '?').join(',');
    const params = [user.id, ...TERMINAL_STATUSES, 'cancelled', 'disapproved'];

    const [rows] = await pool.query(`
      SELECT *
      FROM delivery_requests
      WHERE assigned_rider_id = ?
        AND (
          delivery_status IN (${terminalDeliveryPlaceholders})
          OR status IN (?, ?)
        )
      ORDER BY completed_at DESC, updated_at DESC, created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countRows] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM delivery_requests
      WHERE assigned_rider_id = ?
        AND (
          delivery_status IN (${terminalDeliveryPlaceholders})
          OR status IN (?, ?)
        )
    `, params);

    const total = (countRows as any[])[0]?.total || 0;
    res.json({
      data: (rows as any[]).map(formatRequestRow),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Fetch rider history tasks error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
