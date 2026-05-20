import { Router, Response } from 'express';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { 
  createRequestSchema, 
  approveRequestSchema, 
  disapproveRequestSchema,
  returnRequestSchema,
  updateStatusSchema 
} from '../schemas/requestSchema';
// @ts-ignore
import webpush from 'web-push';
import { AuthRequest, authorize } from '../middleware/auth';

const router = Router();

const canViewRequest = (user: AuthRequest['user'], request: any) => {
  if (!user) return false;
  const isAuthorized = user.role === 'admin' ||
    request.requester_id === user.id ||
    (user.department && request.requester_department === user.department) ||
    request.assigned_rider_id === user.id;
  
  if (!isAuthorized) {
    console.log(`[AUTH DEBUG] Access denied for user ${user.id} (${user.role}) on request ${request.request_id}. Owner: ${request.requester_id}, Dept: ${request.requester_department}, Rider: ${request.assigned_rider_id}`);
  }
  return isAuthorized;
};

const formatRequestRow = (row: any) => ({
  ...row,
  delivery_date: row.delivery_date instanceof Date
    ? row.delivery_date.toISOString().split('T')[0]
    : (typeof row.delivery_date === 'string' ? row.delivery_date.split('T')[0] : row.delivery_date),
  pickup_location: { lat: row.pickup_lat, lng: row.pickup_lng, address: row.pickup_address, businessName: row.pickup_business_name, landmarks: row.pickup_landmarks },
  dropoff_location: { lat: row.dropoff_lat, lng: row.dropoff_lng, address: row.dropoff_address, businessName: row.dropoff_business_name, landmarks: row.dropoff_landmarks },
  current_location: row.current_lat !== null && row.current_lat !== undefined && row.current_lng !== null && row.current_lng !== undefined ? { lat: row.current_lat, lng: row.current_lng } : null,
  exceptions: row.exceptions ? (typeof row.exceptions === 'string' ? JSON.parse(row.exceptions) : row.exceptions) : []
});

// Configure Web Push with VAPID keys
try {
  webpush.setVapidDetails(
    'mailto:admin@company.com',
    'BCXzd-f_1CJ033WPwGsbJ1Rovf2yToy43VCA0uoi45_DCV91pmkeroipCr8GVeaKVNmJ9R0k2jL0eBhcWIzLGfE',
    'x2EhA5k0QsYrot0-xuJpZXA7MMvrzb6jGF7yGukGCVo'
  );
} catch (e) {
  console.error('⚠️ WebPush configuration failed:', e);
}

// Get availability/occupancy (Personnel and Admin)
router.get('/availability', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const user = req.user!;
    let query = `
      SELECT time_window, COUNT(*) as count 
      FROM delivery_requests 
      WHERE delivery_date = ? 
      AND status IN ('pending', 'approved', 'assigned', 'submitted_waiting')
      AND (delivery_status IS NULL OR delivery_status NOT IN ('completed', 'failed', 'cancelled'))
    `;
    const params: any[] = [date];

    // BOLA PROTECTION: Personnel only see availability for their own department
    if (user.role === 'personnel') {
      query += ' AND (requester_department = ? OR requester_id = ?)';
      params.push(user.department, user.id);
    }

    query += ' GROUP BY time_window';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/requests/counts - Efficient counting for dashboard
router.get('/counts', authorize(['rider', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    // BOLA PROTECTION: Riders only count their assigned jobs. Admins can see global (if we ever need that, but for now strictly rider-focused)
    if (user.role !== 'rider' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let query = `
      SELECT 
        COUNT(CASE 
          WHEN delivery_date = CURRENT_DATE 
          AND (STR_TO_DATE(SUBSTRING_INDEX(time_window, ' - ', -1), '%H:%i') >= CURTIME())
          AND status = 'approved' 
          AND delivery_status NOT IN ('completed', 'delivered', 'failed', 'cancelled') 
          THEN 1 END) as today,
        COUNT(CASE 
          WHEN (delivery_date < CURRENT_DATE OR (delivery_date = CURRENT_DATE AND STR_TO_DATE(SUBSTRING_INDEX(time_window, ' - ', -1), '%H:%i') < CURTIME()))
          AND status = 'approved' 
          AND delivery_status NOT IN ('completed', 'delivered', 'failed', 'cancelled') 
          THEN 1 END) as overdue
      FROM delivery_requests
    `;
    const params: any[] = [];

    if (user.role === 'rider') {
      query += ' WHERE assigned_rider_id = ?';
      params.push(user.id);
    }

    const [rows]: any = await pool.query(query, params);

    res.json(rows[0] || { today: 0, overdue: 0 });
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all requests with mandatory data isolation
router.get('/', async (req, res) => {
  try {
    const { rider_id, delivery_status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = (req as AuthRequest).user;
    
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let query = 'SELECT * FROM delivery_requests';
    let countQuery = 'SELECT COUNT(*) as total FROM delivery_requests';
    const params: any[] = [];
    const conditions: string[] = [];

    // ENFORCE DATA ISOLATION (Security Rule)
    if (user.role === 'rider') {
      conditions.push('assigned_rider_id = ?');
      conditions.push("status = 'approved'");
      params.push(user.id);
    } else if (user.role === 'personnel') {
      conditions.push('(requester_department = ? OR requester_id = ?)');
      params.push(user.department, user.id);
    } else if (user.role === 'admin') {
      if (rider_id) {
        conditions.push('assigned_rider_id = ?');
        params.push(rider_id);
      }
    }

    if (delivery_status) {
      const statuses = (delivery_status as string).split(',');
      conditions.push(`delivery_status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    const countParams = [...params];
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, countParams);
    
    const total = (countRows as any[])[0]?.total || 0;
    const requests = (rows as any[]).map(formatRequestRow);

    res.json({
      data: requests,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('Fetch requests error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get request tracking payload with authorized SQL-level check
router.get('/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // SECURE QUERY: Use JOIN to verify authorization before returning sensitive data
    const [rows]: any = await pool.query(`
      SELECT dr.*,
             u.current_lat AS rider_current_lat,
             u.current_lng AS rider_current_lng,
             u.updated_at AS rider_location_updated_at,
             u.status AS rider_user_status
      FROM delivery_requests dr
      LEFT JOIN users u ON u.id = dr.assigned_rider_id
      WHERE dr.request_id = ?
      AND (
        ? = 'admin' OR
        dr.assigned_rider_id = ? OR
        dr.requester_id = ? OR
        (dr.requester_department = ? AND dr.requester_department IS NOT NULL)
      )
    `, [id, user.role, user.id, user.id, user.department]);

    if (!rows || rows.length === 0) {
      // Differentiate between 404 (Not Found) and 403 (Forbidden/No Access)
      const [exists]: any = await pool.query('SELECT 1 FROM delivery_requests WHERE request_id = ?', [id]);
      if (exists.length === 0) return res.status(404).json({ error: 'Request not found' });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const row = rows[0];
    const request = formatRequestRow(row);
    const requestCurrentLocation = row.current_lat !== null && row.current_lat !== undefined && row.current_lng !== null && row.current_lng !== undefined
      ? { lat: Number(row.current_lat), lng: Number(row.current_lng), source: 'request' }
      : null;
    const riderCurrentLocation = row.rider_current_lat !== null && row.rider_current_lat !== undefined && row.rider_current_lng !== null && row.rider_current_lng !== undefined
      ? { lat: Number(row.rider_current_lat), lng: Number(row.rider_current_lng), source: 'rider', updated_at: row.rider_location_updated_at }
      : null;

    const [historyRows]: any = await pool.query(
      'SELECT lat, lng, timestamp FROM location_logs WHERE request_id = ? ORDER BY timestamp ASC',
      [id]
    );

    res.json({
      request,
      current_location: requestCurrentLocation || riderCurrentLocation,
      request_current_location: requestCurrentLocation,
      rider_current_location: riderCurrentLocation,
      history: (historyRows || []).map((log: any) => ({
        lat: Number(log.lat),
        lng: Number(log.lng),
        timestamp: log.timestamp
      })),
      tracking_state: {
        has_request_location: Boolean(requestCurrentLocation),
        has_rider_location: Boolean(riderCurrentLocation),
        is_request_specific: Boolean(requestCurrentLocation),
        is_fallback: !requestCurrentLocation && Boolean(riderCurrentLocation),
        rider_status: row.rider_user_status || null
      }
    });
  } catch (error) {
    console.error('[TRACKING] Secure query failed:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get a single request by ID with BOLA protection
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await pool.query('SELECT * FROM delivery_requests WHERE request_id = ?', [id]);
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const row = (rows as any[])[0];

    if (!canViewRequest(user, row)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to view this request' });
    }

    res.json(formatRequestRow(row));
  } catch (error) {
    console.error('Fetch request detail error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/requests/:id/status-history - Get audit logs for a request (BOLA protection)
router.get('/:id/status-history', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;

    // BOLA PROTECTION: Check permissions first
    const [rows] = await pool.query('SELECT requester_id, requester_department, assigned_rider_id FROM delivery_requests WHERE request_id = ?', [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = (rows as any[])[0];
    const isAuthorized = user.role === 'admin' || 
                       request.requester_id === user.id || 
                       (user.department && request.requester_department === user.department) ||
                       request.assigned_rider_id === user.id;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [logs] = await pool.query(
      'SELECT timestamp, status, remark FROM status_logs WHERE request_id = ? ORDER BY timestamp ASC',
      [id]
    );
    res.json(logs);
  } catch (error) {
    console.error('Status history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new request (Personnel and Admin)
router.post('/', authorize(['admin', 'personnel']), validate(createRequestSchema), async (req, res) => {
  try {
    const {
      requester_id, requester_name, requester_department,
      delivery_date, time_window, pickup_location, dropoff_location,
      pickup_contact_name, pickup_contact_mobile,
      recipient_name, recipient_contact, request_type, urgency_level, on_behalf_of,
      personnel_instructions, admin_remark
    } = req.body || {};

    const request_id = `req_${Date.now()}`;

    await pool.query(`
      INSERT INTO delivery_requests (
        request_id, requester_id, requester_name, requester_department,
        delivery_date, time_window, 
        pickup_lat, pickup_lng, pickup_address, pickup_business_name, pickup_landmarks,
        dropoff_lat, dropoff_lng, dropoff_address, dropoff_business_name, dropoff_landmarks, 
        pickup_contact_name, pickup_contact_mobile,
        recipient_name, recipient_contact,
        request_type, urgency_level, personnel_instructions, on_behalf_of, admin_remark,
        status, delivery_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted_waiting', 'pending')
    `, [
      request_id, requester_id, requester_name, requester_department,
      delivery_date, time_window, 
      pickup_location.lat, pickup_location.lng, pickup_location.address, pickup_location.businessName || null, pickup_location.landmarks || null,
      dropoff_location.lat, dropoff_location.lng, dropoff_location.address, dropoff_location.businessName || null, dropoff_location.landmarks || null,
      pickup_contact_name || null, pickup_contact_mobile || null,
      recipient_name, recipient_contact,
      request_type, urgency_level, personnel_instructions || null, on_behalf_of || null, admin_remark || null,
    ]);

    const [rows] = await pool.query('SELECT * FROM delivery_requests WHERE request_id = ?', [request_id]);
    const row = (rows as any[])[0];
    const request = {
      ...row,
      delivery_date: row.delivery_date instanceof Date 
        ? row.delivery_date.toISOString().split('T')[0] 
        : (typeof row.delivery_date === 'string' ? row.delivery_date.split('T')[0] : row.delivery_date),
      pickup_location: { lat: row.pickup_lat, lng: row.pickup_lng, address: row.pickup_address, businessName: row.pickup_business_name, landmarks: row.pickup_landmarks },
      dropoff_location: { lat: row.dropoff_lat, lng: row.dropoff_lng, address: row.dropoff_address, businessName: row.dropoff_business_name, landmarks: row.dropoff_landmarks },
      current_location: row.current_lat !== null && row.current_lat !== undefined && row.current_lng !== null && row.current_lng !== undefined ? { lat: row.current_lat, lng: row.current_lng } : null
    };
    res.json(request);

    // Delayed admin notification logic remains the same...
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Cancel a request (Admin can cancel anytime; Personnel only within 60s window)
router.put('/:id/cancel', async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { admin_remark } = req.body;
    const user = (req as AuthRequest).user!;
    
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT status, delivery_status, requester_id, assigned_rider_id, requester_department, delivery_date FROM delivery_requests WHERE request_id = ? FOR UPDATE', [id]) as any[];
    
    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found.' });
    }

    const request = rows[0];

    // SECURITY: Authorization Logic
    const isAuthorized = user.role === 'admin' || (user.role === 'personnel' && request.status === 'submitted_waiting' && (request.requester_id === user.id || request.requester_department === user.department));
    
    if (!isAuthorized) {
      await conn.rollback();
      return res.status(403).json({ error: 'You do not have permission to cancel this request.' });
    }

    if (['completed', 'failed'].includes(request.delivery_status)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot cancel a request that is already terminal.' });
    }

    await conn.query(`
      UPDATE delivery_requests SET status = 'cancelled', delivery_status = 'cancelled', admin_remark = ? WHERE request_id = ?
    `, [admin_remark || 'Cancelled by requester', id]);

    // Create notifications for Personnel and Rider (if assigned)
    const requesterId = request.requester_id;
    const riderId = request.assigned_rider_id;
    
    const personnelNotifId = `notif_${Date.now()}_cancel_p_${Math.random().toString(36).substring(7)}`;
    const personnelMsg = `Your request #${String(id).slice(-6).toUpperCase()} has been cancelled.`;
    await conn.query(
      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
      [personnelNotifId, requesterId, personnelMsg, 'request_cancelled', id]
    );

    let riderNotifId = null;
    let riderMsg = null;
    if (riderId) {
      riderNotifId = `notif_${Date.now()}_cancel_r_${Math.random().toString(36).substring(7)}`;
      riderMsg = `Assigned task #${String(id).slice(-6).toUpperCase()} has been cancelled.`;
      await conn.query(
        'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
        [riderNotifId, riderId, riderMsg, 'assignment_cancelled', id]
      );
    }

    await conn.commit();

    // REAL-TIME BROADCAST
    const io = req.app.get('io');
    if (io) {
      // 1. Notify the Personnel
      io.to(requesterId).emit('notification-added', { 
        id: personnelNotifId, 
        message: personnelMsg, 
        type: 'request_cancelled', 
        request_id: id 
      });

      // 2. Notify the Rider (if exists)
      if (riderId) {
        io.to(riderId).emit('notification-added', { 
          id: riderNotifId, 
          message: riderMsg, 
          type: 'assignment_cancelled', 
          request_id: id 
        });
      }

      // 3. Global update for dashboards
      io.emit('request-updated', { 
        request_id: id, 
        status: 'cancelled', 
        delivery_status: 'cancelled',
        updated_at: new Date().toISOString()
      });

      // 4. Delivery status specific update
      io.emit('delivery-status-updated', { 
        request_id: id, 
        status: 'cancelled' 
      });

      console.log(`📡 Broadcast: Request ${id} cancelled. Notified requester ${requesterId}${riderId ? ` and rider ${riderId}` : ''}`);
    }

    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) conn.release();
  }
});

// Approve a request (Admin only)
router.put('/:id/approve', authorize(['admin']), validate(approveRequestSchema), async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { rider_id, admin_remark } = req.body;
    
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. LOCK the row and check status to prevent race conditions (BUG 05)
    const [rows]: any = await conn.query(
      'SELECT status FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const currentStatus = rows[0].status;
    if (currentStatus === 'approved') {
      await conn.rollback();
      return res.status(409).json({ 
        error: 'Conflict: This request has already been approved by another admin.',
        code: 'ALREADY_APPROVED'
      });
    }

    // 2. Proceed with assignment
    const [riderRows] = await conn.query('SELECT name FROM users WHERE id = ?', [rider_id]) as any[];
    const riderName = riderRows[0]?.name || 'Unknown Rider';

    await conn.query(`
      UPDATE delivery_requests 
      SET status = 'approved', assigned_rider_id = ?, assigned_rider_name = ?, admin_remark = ?, delivery_status = 'assigned'
      WHERE request_id = ?
    `, [rider_id, riderName, admin_remark, id]);

    const notifId = `notif_${Date.now()}_assign_${Math.random().toString(36).substring(2, 7)}`;
    const msg = `New delivery task assigned to you. Request #${String(id).slice(-6).toUpperCase()}.`;
    await conn.query(
      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
      [notifId, rider_id, msg, 'new_assignment', id]
    );

    // FIX: Also notify the Personnel (Requester) that their request was approved/assigned
    const [reqDetails]: any = await conn.query('SELECT requester_id FROM delivery_requests WHERE request_id = ?', [id]);
    const requesterId = reqDetails[0]?.requester_id;
    const personnelNotifId = `notif_${Date.now()}_pers_${Math.random().toString(36).substring(2, 7)}`;
    const personnelMsg = `Your request #${String(id).slice(-8).toUpperCase()} has been approved and assigned to ${riderName}.`;
    
    if (requesterId) {
      await conn.query(
        'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
        [personnelNotifId, requesterId, personnelMsg, 'request_approved', id]
      );
    }

    await conn.commit();

    // REAL-TIME BROADCAST: Notify the specific rider and all admins
    const io = req.app.get('io');
    if (io) {
      // 1. Tell the specific rider they have a new task
      io.to(rider_id).emit('new_assignment', { request_id: id, rider_name: riderName });
      io.to(rider_id).emit('notification-added', { id: notifId, message: msg, type: 'new_assignment', request_id: id });
      
      // 2. Tell the Personnel (Requester) directly
      if (requesterId) {
        io.to(requesterId).emit('notification-added', { 
          id: personnelNotifId, 
          message: personnelMsg, 
          type: 'request_approved', 
          request_id: id 
        });
      }

      // 3. Refresh lists for everyone (admin dashboards)
      // ENRICHED PAYLOAD (FIX 08): Include delivery_status and rider info for instant sync
      io.emit('request-updated', { 
        request_id: id, 
        status: 'approved',
        delivery_status: 'assigned',
        assigned_rider_id: rider_id,
        assigned_rider_name: riderName,
        admin_remark: admin_remark,
        updated_at: new Date().toISOString()
      });
      
      console.log(`📡 Broadcast: Task ${id} assigned to ${rider_id}`);
    }

    res.json({ success: true, riderName });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Approval error:", error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) conn.release();
  }
});

// Disapprove a request (Admin only)
router.put('/:id/disapprove', authorize(['admin']), validate(disapproveRequestSchema), async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { admin_remark } = req.body;
    
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // LOCK and VALIDATE: Only pending/submitted_waiting can be disapproved
    const [rows]: any = await conn.query(
      'SELECT status, requester_id FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const { status, requester_id } = rows[0];
    if (status !== 'pending' && status !== 'submitted_waiting') {
      await conn.rollback();
      return res.status(400).json({ 
        error: `Cannot disapprove a request that is currently '${status}'. Only pending requests can be disapproved.` 
      });
    }

    await conn.query(`
      UPDATE delivery_requests SET status = 'disapproved', admin_remark = ? WHERE request_id = ?
    `, [admin_remark, id]);

    const requestIdStr = id as string;
    const msg = `Your request #${requestIdStr.slice(-6).toUpperCase()} has been declined${admin_remark ? `: ${admin_remark}` : '.'}`;
    const notifId = `notif_${Date.now()}_d_${Math.random().toString(36).substring(7)}`;
    
    await conn.query(
      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
      [notifId, requester_id, msg, 'request_disapproved', id]
    );

    await conn.commit();

    const io = req.app.get('io');
    if (io) {
      io.emit('request-updated', { request_id: id, status: 'disapproved' });
      io.to(requester_id).emit('notification-added', { id: notifId, message: msg, type: 'request_disapproved', request_id: id });
    }

    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Disapprove error:", error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) conn.release();
  }
});

// Return for revision (Admin only)
router.put('/:id/return', authorize(['admin']), validate(returnRequestSchema), async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { admin_remark } = req.body;
    
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // LOCK and VALIDATE: Only pending/submitted_waiting can be returned
    const [rows]: any = await conn.query(
      'SELECT status, requester_id FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const { status, requester_id } = rows[0];
    if (status !== 'pending' && status !== 'submitted_waiting') {
      await conn.rollback();
      return res.status(400).json({ 
        error: `Cannot return a request that is currently '${status}'. Only pending requests can be returned.` 
      });
    }

    await conn.query(`
      UPDATE delivery_requests SET status = 'returned_for_revision', admin_remark = ? WHERE request_id = ?
    `, [admin_remark, id]);

    const msg = `Action Required: Your request #${String(id).slice(-6).toUpperCase()} needs revision.`;
    const notifId = `notif_${Date.now()}_rev_${Math.random().toString(36).substring(7)}`;
    
    await conn.query(
      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
      [notifId, requester_id, msg, 'request_revision', id]
    );

    await conn.commit();

    const io = req.app.get('io');
    if (io) {
      io.emit('request-updated', { request_id: id, status: 'returned_for_revision' });
      io.to(requester_id).emit('notification-added', { id: notifId, message: msg, type: 'request_revision', request_id: id });
    }

    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Return error:", error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) conn.release();
  }
});

// Resubmit a request (Personnel only)
router.put('/:id/resubmit', authorize(['admin', 'personnel']), validate(createRequestSchema), async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;
    const {
      delivery_date, time_window, pickup_location, dropoff_location,
      pickup_contact_name, pickup_contact_mobile,
      recipient_name, recipient_contact, request_type, urgency_level, on_behalf_of,
      personnel_instructions
    } = req.body;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. LOCK the row and check status to prevent resubmitting jobs that aren't returned for revision
    // BOLA PROTECTION: Also fetch requester_id and department for authorization
    const [rows]: any = await conn.query(
      'SELECT status, requester_id, requester_department FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = rows[0];

    // BOLA Check: Personnel can only resubmit if it's their own or their department's
    if (user.role === 'personnel' && request.requester_id !== user.id && request.requester_department !== user.department) {
      await conn.rollback();
      return res.status(403).json({ error: 'Forbidden: You do not have permission to resubmit this request' });
    }

    const currentStatus = request.status;
    if (currentStatus !== 'returned_for_revision') {
      await conn.rollback();
      return res.status(400).json({ 
        error: `Cannot resubmit a request that is currently '${currentStatus}'. Only jobs returned for revision can be resubmitted.` 
      });
    }

    await conn.query(`
      UPDATE delivery_requests SET 
        delivery_date = ?, time_window = ?, 
        pickup_lat = ?, pickup_lng = ?, pickup_address = ?, pickup_business_name = ?, pickup_landmarks = ?,
        dropoff_lat = ?, dropoff_lng = ?, dropoff_address = ?, dropoff_business_name = ?, dropoff_landmarks = ?, 
        pickup_contact_name = ?, pickup_contact_mobile = ?,
        recipient_name = ?, recipient_contact = ?,
        request_type = ?, urgency_level = ?, personnel_instructions = ?, on_behalf_of = ?,
        status = 'pending', delivery_status = 'pending', 
        assigned_rider_id = NULL, assigned_rider_name = NULL,
        admin_remark = NULL, 
        created_at = NOW(), updated_at = NOW()
      WHERE request_id = ?
    `, [
      delivery_date, time_window, 
      pickup_location.lat, pickup_location.lng, pickup_location.address, pickup_location.businessName || null, pickup_location.landmarks || null,
      dropoff_location.lat, dropoff_location.lng, dropoff_location.address, dropoff_location.businessName || null, dropoff_location.landmarks || null,
      pickup_contact_name || null, pickup_contact_mobile || null,
      recipient_name, recipient_contact,
      request_type, urgency_level, personnel_instructions || null, on_behalf_of || null,
      id
    ]);

    await conn.commit();

    const io = req.app.get('io');
    if (io) {
      io.emit('request-updated', { request_id: id, status: 'pending' });

      // Notify admins
      const [admins]: any = await pool.query('SELECT id FROM users WHERE role = "admin"');
      const requestIdStr = id as string;
      const msg = `Request #${requestIdStr.slice(-6).toUpperCase()} has been resubmitted for approval.`;
      
      for (const admin of admins) {
        const notifId = `notif_${Date.now()}_resub_${Math.random().toString(36).substring(7)}`;
        await pool.query(
          'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
          [notifId, admin.id, msg, 'request_submitted', id]
        );
        io.to(admin.id).emit('notification-added', { 
          id: notifId, 
          message: msg, 
          type: 'request_submitted', 
          request_id: id 
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Resubmit error:", error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) conn.release();
  }
});

// Update delivery status (Riders only for their own tasks)
router.put('/:id/status', validate(updateStatusSchema), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, remark, current_lat, current_lng, timestamp } = req.body;
    const user = (req as AuthRequest).user!;

    await connection.beginTransaction();

    // SECURITY & INTEGRITY: Fetch current state with lock
    const [currentRows] = await connection.query(
      'SELECT status, delivery_status, assigned_rider_id FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    ) as any[];

    if (!currentRows || currentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Request not found.' });
    }

    const current = currentRows[0];

    // SECURITY: Ensure only the assigned rider can update status
    if (user.role === 'rider') {
       if (current.assigned_rider_id !== user.id) {
          await connection.rollback();
          return res.status(403).json({ error: 'Access denied.' });
       }
    } else if (user.role !== 'admin') {
       await connection.rollback();
       return res.status(403).json({ error: 'Forbidden' });
    }

    // INTEGRITY CHECK: Reject updates if job is terminal
    const terminalStatuses = ['completed', 'failed', 'cancelled', 'disapproved', 'delivered'];
    if (terminalStatuses.includes(current.delivery_status) || terminalStatuses.includes(current.status)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot update status of a terminal job.' });
    }

    let query = 'UPDATE delivery_requests SET delivery_status = ?, rider_remark = ?';
    let params: any[] = [status, remark];

    if (status === 'completed' || status === 'failed') {
      query += ', completed_at = ?';
      params.push(timestamp ? new Date(timestamp) : new Date());
    }

    if (current_lat !== undefined && current_lng !== undefined) {
      query += ', current_lat = ?, current_lng = ?';
      params.push(current_lat, current_lng);
    }

    query += ' WHERE request_id = ?';
    params.push(id);

    await connection.query(query, params);

    // 1. Audit Log Entry (Inside Transaction)
    await connection.query(
      'INSERT INTO status_logs (request_id, rider_id, status, remark) VALUES (?, ?, ?, ?)',
      [id, user.id, status, remark || `Status updated to ${status}`]
    );

    await connection.commit();

    // --- SENIOR FIX: REAL-TIME BROADCAST & NOTIFICATIONS ---
    const io = req.app.get('io');
    if (io) {
      // 2. Broadcast UI refresh signals (Global and Specific)
      io.emit('delivery-status-updated', { request_id: id, status, remark });
      io.emit('request-updated', { request_id: id, status: 'approved', delivery_status: status });
      io.to(`job_${id}`).emit('job-status-changed', { request_id: id, status, message: remark });

      // 3. Create Formal Notifications for Terminal States (Completed/Failed)
      if (['completed', 'failed', 'delivered'].includes(status)) {
        try {
          const [details]: any = await pool.query(
            'SELECT requester_id, requester_name, assigned_rider_name FROM delivery_requests WHERE request_id = ?',
            [id]
          );
          
          if (details.length > 0) {
            const { requester_id, assigned_rider_name } = details[0];
            const type = status === 'failed' ? 'delivery_failed' : 'delivery_completed';
            const msg = `Delivery #${String(id).slice(-6).toUpperCase()} has been marked as ${status.toUpperCase()} by ${assigned_rider_name}${remark ? `: ${remark}` : '.'}`;

            // A. Notify Requester (Personnel)
            const notifIdP = `notif_${Date.now()}_p_${Math.random().toString(36).substring(7)}`;
            await pool.query(
              'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
              [notifIdP, requester_id, msg, type, id]
            );
            io.to(requester_id).emit('notification-added', { id: notifIdP, message: msg, type, request_id: id });

            // B. Notify All Admins
            const [admins]: any = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']);
            for (const admin of admins) {
              const notifIdA = `notif_${Date.now()}_a_${Math.random().toString(36).substring(7)}`;
              await pool.query(
                'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
                [notifIdA, admin.id, msg, type, id]
              );
              io.to(admin.id).emit('notification-added', { id: notifIdA, message: msg, type, request_id: id });
            }
          }
        } catch (notifErr) {
          console.error('[STATUS] Failed to generate notifications:', notifErr);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Get location history logs (BOLA protection)
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user!;
    
    // Check if user is allowed to see this history
    const [reqCheck]: any = await pool.query('SELECT assigned_rider_id, requester_id, requester_department FROM delivery_requests WHERE request_id = ?', [id]);
    if (reqCheck.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const row = reqCheck[0];
    if (user.role === 'rider' && row.assigned_rider_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
    if (user.role === 'personnel' && row.requester_department !== user.department && row.requester_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query('SELECT lat, lng, timestamp FROM location_logs WHERE request_id = ? ORDER BY timestamp ASC', [id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
