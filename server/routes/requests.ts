import { Router, Response } from 'express';
import { pool } from '../db';
import { onlineRiders } from '../presence';
import { logAction } from '../services/auditLogger';
import { validate } from '../middleware/validate';
import { 
  createRequestSchema, 
  approveRequestSchema, 
  disapproveRequestSchema,
  returnRequestSchema,
  updateStatusSchema,
  resequenceSchema,
  patchLocationsSchema
} from '../schemas/requestSchema';
import { AuthRequest, authorize } from '../middleware/auth';
import { resolveRequestAttribution } from '../utils/requestAttribution';
import { getOverdueMetadata, getProactiveOverdueMetadata } from '../utils/overdue';
import { ACCOUNTING_BUCKET_SQL, buildRequestAccounting, getAccountingBucket } from '../utils/requestAccounting';
import { sendPushNotification } from './notifications';
import { persistAdminDispatchNotifications, persistDeliveryNotification, publishDeliveryNotification } from '../services/deliveryNotifications';
import { appendRequestsToRiderQueue, lockRiderQueues, normalizeRiderQueueOrder, replaceRiderQueueOrder } from '../services/riderTaskQueue';
import { RiderQueueValidationError } from '../utils/riderQueue';

const router = Router();

const getPhilippineDateString = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const normalizeDateString = (date: any) => {
  if (date instanceof Date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }
  if (typeof date === 'string') return date.split('T')[0];
  return String(date || '');
};

const getRiderAvailabilityIssue = async (conn: any, riderId: string, deliveryDates: any[]) => {
  const [riderRows] = await conn.query(`
    SELECT u.id, u.name, u.is_on_duty,
           (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')) LIMIT 1) as attendance_status
    FROM users u
    WHERE u.id = ? AND u.role = 'rider'
  `, [riderId]) as any[];

  if (!riderRows || riderRows.length === 0) {
    return { code: 'RIDER_NOT_FOUND', message: 'Rider not found.' };
  }

  const rider = riderRows[0];
  const hasTodayRequest = deliveryDates.some((date) => normalizeDateString(date) === getPhilippineDateString());
  if (!hasTodayRequest) return null;

  if (rider.attendance_status === 'absent') return { code: 'RIDER_UNAVAILABLE', message: 'Rider is absent today.' };
  if (rider.attendance_status === 'on_leave') return { code: 'RIDER_UNAVAILABLE', message: 'Rider is on leave today.' };
  if (!rider.is_on_duty) return { code: 'RIDER_UNAVAILABLE', message: 'Rider is off duty.' };
  if (!onlineRiders.has(riderId)) return { code: 'RIDER_UNAVAILABLE', message: 'Rider is offline.' };

  return null;
};

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
  exceptions: row.exceptions ? (typeof row.exceptions === 'string' ? JSON.parse(row.exceptions) : row.exceptions) : [],
  ...getOverdueMetadata({
    delivery_date: row.delivery_date,
    time_window: row.time_window,
    status: row.status,
    delivery_status: row.delivery_status,
    assigned_rider_id: row.assigned_rider_id,
    exceptions: row.exceptions ? (typeof row.exceptions === 'string' ? JSON.parse(row.exceptions) : row.exceptions) : [],
  }),
  ...getProactiveOverdueMetadata(row),
});

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
router.get('/counts', authorize(['rider', 'admin', 'personnel']), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    let query = 'SELECT status, delivery_status, delivery_date, time_window, scheduled_end_at, assigned_rider_id FROM delivery_requests';
    const params: any[] = [];

    // DATA ISOLATION: Apply filters based on role
    const conditions: string[] = [];
    if (user.role === 'rider') {
      conditions.push('assigned_rider_id = ?');
      params.push(user.id);
    } else if (user.role === 'personnel') {
      conditions.push('(requester_department = ? OR requester_id = ?)');
      params.push(user.department, user.id);
    }
    if (req.query.monthYear) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.monthYear))) return res.status(400).json({ error: 'Invalid monthYear' });
      conditions.push("DATE_FORMAT(created_at, '%Y-%m') = ?");
      params.push(req.query.monthYear);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [rows]: any = await pool.query(query, params);

    const now = new Date();
    const records = rows.map((row: any) => ({ ...row, ...getOverdueMetadata(row, now), ...getProactiveOverdueMetadata(row, now) }));
    res.json({ ...buildRequestAccounting(records),
      today: records.filter((row: any) => String(row.delivery_date).slice(0, 10) === getPhilippineDateString() && getAccountingBucket(row) === 'active').length });
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all requests with mandatory data isolation
router.get('/', async (req, res) => {
  try {
    const { rider_id, delivery_status, monthYear, page = 1, limit = 10 } = req.query;
    if (!Number.isInteger(Number(page)) || Number(page) < 1 || !Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 1000) {
      return res.status(400).json({ error: 'Invalid pagination' });
    }
    const offset = (Number(page) - 1) * Number(limit);
    const user = (req as AuthRequest).user;
    
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    // Admin reconciliation needs all records from one SELECT, not a truncated first page.
    const allRecords = req.query.all === 'true' && user.role === 'admin';

    let query = 'SELECT * FROM delivery_requests';
    let countQuery = 'SELECT COUNT(*) as total FROM delivery_requests';
    const params: any[] = [];
    const conditions: string[] = [];

    // ENFORCE DATA ISOLATION (Security Rule)
    if (user.role === 'rider') {
      conditions.push('assigned_rider_id = ?');
      conditions.push("status = 'approved'");
      // LAYER 1: Visibility Control - Block future tasks (using PH time UTC+8)
      conditions.push('delivery_date <= DATE(CONVERT_TZ(NOW(), "+00:00", "+08:00"))');
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
    if (monthYear) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(monthYear))) return res.status(400).json({ error: 'Invalid monthYear' });
      conditions.push("DATE_FORMAT(created_at, '%Y-%m') = ?");
      params.push(monthYear);
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    const countParams = [...params];
    const activeFirstOrder = `
      ORDER BY
        CASE
          WHEN (${ACCOUNTING_BUCKET_SQL}) = 'active'
          THEN 0
          ELSE 1
        END ASC,
        CASE
          WHEN (${ACCOUNTING_BUCKET_SQL}) = 'active'
          THEN delivery_date
          ELSE NULL
        END ASC,
        CASE
          WHEN (${ACCOUNTING_BUCKET_SQL}) = 'active'
          THEN time_window
          ELSE NULL
        END ASC,
        created_at DESC, request_id ASC
    `;
    query += `${activeFirstOrder}${allRecords ? '' : ' LIMIT ? OFFSET ?'}`;
    if (!allRecords) params.push(Number(limit), offset);

    const [rows] = await pool.query(query, params);
    const [countRows] = allRecords ? [[{ total: (rows as any[]).length }]] : await pool.query(countQuery, countParams);
    
    const total = (countRows as any[])[0]?.total || 0;
    const requests = (rows as any[]).map(formatRequestRow);

    res.json({
      data: requests,
      meta: { total, page: allRecords ? 1 : Number(page), limit: allRecords ? total : Number(limit), totalPages: allRecords ? 1 : Math.ceil(total / Number(limit)) }
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
             u.status AS rider_user_status,
             u.is_on_duty AS rider_is_on_duty
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

    // Calculate real-time presence for the assigned rider
    const riderIsOnline = row.assigned_rider_id ? onlineRiders.has(row.assigned_rider_id) : false;

    // --- SENIOR FALLBACK LOGIC: Guarantee valid data even if live is rejected ---
    const lastKnownGood = historyRows.length > 0 ? historyRows[historyRows.length - 1] : null;
    let finalLocation = requestCurrentLocation || riderCurrentLocation;
    
    let isFallbackToHistory = false;
    if (!finalLocation && lastKnownGood) {
      finalLocation = { 
        lat: Number(lastKnownGood.lat), 
        lng: Number(lastKnownGood.lng), 
        source: 'history_fallback' 
      };
      isFallbackToHistory = true;
    }

    res.json({
      request,
      current_location: finalLocation,
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
        is_fallback: isFallbackToHistory || (!requestCurrentLocation && Boolean(riderCurrentLocation)),
        rider_status: row.rider_user_status || null,
        rider_is_online: riderIsOnline,
        rider_is_on_duty: Boolean(row.rider_is_on_duty)
      }
    });
  } catch (error) {
    console.error('[TRACKING] Secure query failed:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// PATCH-LOCATIONS endpoint (Admin only) - MUST BE BEFORE GET /:id to avoid collision
router.put('/:id/patch-locations', authorize(['admin']), validate(patchLocationsSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { pickup, dropoff } = req.body;
  
  try {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (pickup) {
      updates.push('pickup_lat = ?, pickup_lng = ?');
      params.push(pickup.lat, pickup.lng);
    }
    
    if (dropoff) {
      updates.push('dropoff_lat = ?, dropoff_lng = ?');
      params.push(dropoff.lat, dropoff.lng);
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No coordinates provided' });
    
    params.push(id);
    await pool.query(`UPDATE delivery_requests SET ${updates.join(', ')} WHERE request_id = ?`, params);
    
    await logAction({
      actor_id: (req as any).user.id,
      actor_role: (req as any).user.role,
      action: 'PATCH_LOCATION',
      resource_type: 'delivery_requests',
      resource_id: id as string,
      new_values: { pickup, dropoff }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Patch location error:', error);
    res.status(500).json({ error: 'Database update failed' });
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

// POST /api/requests/:id/deviation-resolve - Layer 2 Deviation Response
router.post('/:id/deviation-resolve', authorize(['admin']), async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { approved, note } = req.body;
    const io = req.app.get('io');

    await connection.beginTransaction();

    if (approved) {
      // Logic: Move current task to end of sequence
      const [[current]]: any = await connection.query("SELECT assigned_rider_id FROM delivery_requests WHERE request_id = ?", [id]);
      const [all]: any = await connection.query(
        "SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved') ORDER BY queue_order ASC",
        [current.assigned_rider_id]
      );
      
      const sequence = all.map((r: any) => r.request_id).filter((rid: string) => rid !== id);
      sequence.push(id); // Move skipped task to end

      for (let i = 0; i < sequence.length; i++) {
        await connection.query("UPDATE delivery_requests SET queue_order = ? WHERE request_id = ?", [i + 1, sequence[i]]);
      }
    }

    // Timeline log
    const eventId = `ev_dev_${Date.now()}`;
    await connection.query(
      "INSERT INTO movement_events (id, request_id, event_type, message) VALUES (?, ?, ?, ?)",
      [eventId, id, 'deviation_resolved', `Admin ${approved ? 'APPROVED' : 'DECLINED'} sequence skip. Note: ${note || 'N/A'}`]
    );

    await connection.commit();
    
    // Notify Rider
    const [[reqData]]: any = await connection.query("SELECT assigned_rider_id FROM delivery_requests WHERE request_id = ?", [id]);
    io.to(reqData.assigned_rider_id).emit('requests-updated', { 
      message: `Your deviation request for #${String(id).slice(-6).toUpperCase()} was ${approved ? 'APPROVED' : 'DECLINED'}.` 
    });

    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Resolution failed' });
  } finally {
    connection.release();
  }
});

// Create a new request (Personnel and Admin)
router.post('/', authorize(['admin', 'personnel']), validate(createRequestSchema), async (req, res) => {
  try {
    const {
      requester_id: submittedRequesterId,
      requester_name: submittedRequesterName,
      requester_department: submittedRequesterDepartment,
      delivery_date, time_window, pickup_location, dropoff_location,
      pickup_contact_name, pickup_contact_mobile,
      recipient_name, recipient_contact, request_type, urgency_level, on_behalf_of,
      personnel_instructions, admin_remark
    } = req.body || {};

    const user = (req as AuthRequest).user!;
    let currentPersonnelProfile: { name: string; department: string } | null = null;
    if (user.role === 'personnel') {
      const [profileRows] = await pool.query(
        'SELECT name, department FROM users WHERE id = ? AND role = ? LIMIT 1',
        [user.id, 'personnel']
      ) as any[];
      const profile = profileRows?.[0];
      if (!profile) {
        return res.status(403).json({ error: 'The authenticated personnel account is no longer available.' });
      }
      if (typeof profile.name !== 'string' || !profile.name.trim() || typeof profile.department !== 'string' || !profile.department.trim()) {
        return res.status(403).json({ error: 'The personnel profile must have a name and department before creating requests.' });
      }
      currentPersonnelProfile = { name: profile.name, department: profile.department };
    }

    const attribution = resolveRequestAttribution(
      { id: user.id, role: user.role as 'admin' | 'personnel' },
      currentPersonnelProfile,
      {
        requesterId: submittedRequesterId,
        requesterName: submittedRequesterName,
        department: submittedRequesterDepartment,
      },
    );
    const requester_id = attribution.requesterId;
    const requester_name = attribution.requesterName;
    const finalDepartment = attribution.department;

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
      request_id, requester_id, requester_name, finalDepartment,
      delivery_date, time_window, 
      pickup_location.lat, pickup_location.lng, pickup_location.address, pickup_location.businessName || null, pickup_location.landmarks || null,
      dropoff_location.lat, dropoff_location.lng, dropoff_location.address, dropoff_location.businessName || null, dropoff_location.landmarks || null,
      pickup_contact_name || null, pickup_contact_mobile || null,
      recipient_name, recipient_contact,
      request_type, urgency_level, personnel_instructions || null, on_behalf_of || null, admin_remark || null,
    ]);

    const [rows] = await pool.query('SELECT * FROM delivery_requests WHERE request_id = ?', [request_id]);
    const row = (rows as any[])[0];
    const request = formatRequestRow(row);

    const io = req.app.get('io');
    try {
      const adminNotifications = await persistAdminDispatchNotifications(pool, {
        requestId: request_id,
        type: 'request_submitted',
        message: `New request from ${requester_name} (${finalDepartment}).`,
      });
      for (const notification of adminNotifications) {
        await publishDeliveryNotification(io, notification);
      }
    } catch {
      console.error('[REQUEST] Unable to save Admin submission notifications.');
    }

    res.json(request);

    // ENTERPRISE BROADCAST: Ensure Admins see the new request instantly
    if (io) {
      // TARGETED WHISPERING: Only notify Admins and the specific requester.
      io.to('admin-room').to(row.requester_id).emit('request-updated', { 
        request_id: request_id, 
        status: row.status, 
        delivery_status: row.delivery_status,
        updated_at: new Date().toISOString()
      });
      console.log(`📡 Broadcast: New request ${request_id} from ${requester_name}`);
    }
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
    const isOwnerOrAdmin = user.role === 'admin' || 
      (user.role === 'personnel' && (request.requester_id === user.id || request.requester_department === user.department));
    
    if (!isOwnerOrAdmin) {
      await conn.rollback();
      return res.status(403).json({ error: 'You do not have permission to cancel this request.' });
    }

    if (user.role === 'personnel' && request.status !== 'submitted_waiting' && request.status !== 'pending' && request.status !== 'returned_for_revision') {
      await conn.rollback();
      return res.status(400).json({ error: 'Cancellation window has expired. Only pending or action-required requests can be cancelled.' });
    }

    // TERMINAL LOCK: Block cancellation for terminal jobs
    const terminalStatuses = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];
    if (terminalStatuses.includes(request.delivery_status) || terminalStatuses.includes(request.status)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot cancel a request that is already in a terminal state.' });
    }

    await conn.query(`
      UPDATE delivery_requests SET status = 'cancelled', admin_remark = ? WHERE request_id = ?
    `, [admin_remark || `cancelled (${user.name})`, id]);

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

    const adminAssignmentNotifications = riderId
      ? await persistAdminDispatchNotifications(conn, {
        requestId: String(id),
        type: 'assignment_cancelled',
        message: `An assignment for request #${String(id).slice(-6).toUpperCase()} was cancelled. Review dispatch.`,
      })
      : [];

    await conn.commit();

    // AUDIT LOG (Slice 3.2 Hardening)
    logAction({
      actor_id: user.id,
      actor_role: user.role,
      action: 'cancel_request',
      resource_type: 'delivery_requests',
      resource_id: id,
      new_values: { status: 'cancelled', delivery_status: 'cancelled', admin_remark },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // REAL-TIME BROADCAST
    const io = req.app.get('io');
    await publishDeliveryNotification(io, {
      id: personnelNotifId, user_id: requesterId, message: personnelMsg,
      type: 'request_cancelled', request_id: String(id),
    });
    if (riderId && riderNotifId && riderMsg) {
      await publishDeliveryNotification(io, {
        id: riderNotifId, user_id: riderId, message: riderMsg,
        type: 'assignment_cancelled', request_id: String(id),
      });
    }
    for (const notification of adminAssignmentNotifications) {
      await publishDeliveryNotification(io, notification);
    }
    if (io) {
      // 3. TARGETED WHISPERING: Notify admin, requester, and rider (if assigned)
      io.to('admin-room')
        .to(requesterId)
        .to(`job_${id}`)
        .emit('request-updated', { 
          request_id: id, 
          status: 'cancelled', 
          delivery_status: 'cancelled',
          updated_at: new Date().toISOString()
        });

      // 4. Delivery status specific update
      io.to('admin-room')
        .to(requesterId)
        .to(`job_${id}`)
        .emit('delivery-status-updated', { 
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

    // Lock the selected rider before locking a task row. Queue mutations all use rider-first ordering.
    const [riderRows] = await conn.query(`
      SELECT u.id, u.name, u.is_on_duty,
             (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')) LIMIT 1) as attendance_status
      FROM users u
      WHERE u.id = ? AND u.role = 'rider'
    `, [rider_id]) as any[];
    if (!riderRows || riderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Rider not found.' });
    }
    await lockRiderQueues(conn, [String(rider_id)]);

    // Lock and validate the task after the rider queue lock to avoid queue lock inversion.
    const [rows]: any = await conn.query(
      'SELECT status, delivery_status, delivery_date FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const currentStatus = rows[0].status;
    const currentDeliveryStatus = rows[0].delivery_status;

    if (currentStatus === 'approved') {
      await conn.rollback();
      return res.status(409).json({ 
        error: 'Conflict: This request has already been approved by another admin.',
        code: 'ALREADY_APPROVED'
      });
    }

    // TERMINAL LOCK: Block approval for terminal jobs
    const terminalStatuses = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];
    if (terminalStatuses.includes(currentStatus) || terminalStatuses.includes(currentDeliveryStatus)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot approve or reassign a request in a terminal state.' });
    }

    // Proceed with assignment while retaining the rider queue lock.
    const riderName = riderRows[0].name || 'Unknown Rider';
    const availabilityIssue = await getRiderAvailabilityIssue(conn, rider_id, [rows[0].delivery_date]);
    if (availabilityIssue) {
      await conn.rollback();
      return res.status(availabilityIssue.code === 'RIDER_NOT_FOUND' ? 404 : 409).json({
        error: availabilityIssue.code === 'RIDER_NOT_FOUND'
          ? availabilityIssue.message
          : `Cannot assign this request: ${availabilityIssue.message}`,
        code: availabilityIssue.code,
      });
    }

    await conn.query(`
      UPDATE delivery_requests 
      SET status = 'approved', assigned_rider_id = ?, assigned_rider_name = ?, admin_remark = ?, delivery_status = 'assigned', queue_order = NULL, approved_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `, [rider_id, riderName, admin_remark, id]);
    const queueRanks = await appendRequestsToRiderQueue(conn, rider_id, [String(id)]);
    const queueOrder = queueRanks[0];

    const msg = `New delivery task assigned to you. Request #${String(id).slice(-6).toUpperCase()}.`;
    const riderNotification = await persistDeliveryNotification(conn, {
      recipientId: rider_id, requestId: String(id), type: 'new_assignment', message: msg,
    });

    // FIX: Also notify the Personnel (Requester) that their request was approved/assigned
    const [reqDetails]: any = await conn.query('SELECT requester_id, pickup_address, dropoff_address, recipient_contact, dropoff_lat, dropoff_lng FROM delivery_requests WHERE request_id = ?', [id]);
    const requestDetails = reqDetails[0] || {};
    const requesterId = requestDetails.requester_id;
    const personnelMsg = `Your request #${String(id).slice(-8).toUpperCase()} has been approved and assigned to ${riderName}.`;
    let personnelNotification: Awaited<ReturnType<typeof persistDeliveryNotification>> | null = null;
    
    if (requesterId) {
      personnelNotification = await persistDeliveryNotification(conn, {
        recipientId: requesterId, requestId: String(id), type: 'request_approved', message: personnelMsg,
      });
    }

    await conn.commit();

    // 3. AUDIT LOG (Phase 3.2 Hardening)
    logAction({
      actor_id: (req as AuthRequest).user!.id,
      actor_role: (req as AuthRequest).user!.role,
      action: 'approve_request',
      resource_type: 'delivery_requests',
      resource_id: id as string,
      new_values: { rider_id, rider_name: riderName, admin_remark, status: 'approved', delivery_status: 'assigned' },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // REAL-TIME BROADCAST: Notify the specific rider and all admins
    const io = req.app.get('io');
    if (personnelNotification) await publishDeliveryNotification(io, personnelNotification);
    if (io) {
      // 1. Tell the specific rider they have a new task
      io.to(rider_id).emit('new_assignment', { request_id: id, rider_name: riderName });
      await publishDeliveryNotification(io, riderNotification, {
        push: {
          send: sendPushNotification,
          title: 'New delivery task assigned',
          body: requestDetails.pickup_address && requestDetails.dropoff_address
            ? `${msg} ${requestDetails.pickup_address} → ${requestDetails.dropoff_address}`
            : msg,
          data: {
            request_id: id, type: 'new_assignment',
            ...(requestDetails.recipient_contact ? { recipient_contact: requestDetails.recipient_contact } : {}),
            ...(requestDetails.dropoff_lat != null ? { dropoff_lat: requestDetails.dropoff_lat } : {}),
            ...(requestDetails.dropoff_lng != null ? { dropoff_lng: requestDetails.dropoff_lng } : {}),
          },
          channelId: 'delivery_updates',
          categoryId: requestDetails.recipient_contact && requestDetails.dropoff_lat != null && requestDetails.dropoff_lng != null
            ? 'DELIVERY_TASK_CALL_MAP'
            : requestDetails.recipient_contact ? 'DELIVERY_TASK_CALL'
              : requestDetails.dropoff_lat != null && requestDetails.dropoff_lng != null ? 'DELIVERY_TASK_MAP' : 'DELIVERY_TASK',
          tag: `delivery:${id}:assignment`,
        },
      });
      
      // 3. TARGETED WHISPERING: Notify admin, requester, and the newly assigned rider
      io.to('admin-room')
        .to(requesterId)
        .to(rider_id)
        .to(`job_${id}`)
        .emit('request-updated', {
          request_id: id, 
          status: 'approved',
          delivery_status: 'assigned',
          assigned_rider_id: rider_id,
          assigned_rider_name: riderName,
          queue_order: queueOrder,
          admin_remark: admin_remark,
          updated_at: new Date().toISOString()
        });
      
      console.log(`📡 Broadcast: Task ${id} assigned to ${rider_id}`);
    }

    res.json({ success: true, riderName, queue_order: queueOrder });
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
      'SELECT status, delivery_status, requester_id FROM delivery_requests WHERE request_id = ? FOR UPDATE',
      [id]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const { status, delivery_status, requester_id } = rows[0];
    if (status !== 'pending' && status !== 'submitted_waiting' && status !== 'returned_for_revision') {
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

    await publishDeliveryNotification(req.app.get('io'), {
      id: notifId, user_id: requester_id, message: msg,
      type: 'request_disapproved', request_id: String(id),
    });

    logAction({
      actor_id: (req as AuthRequest).user!.id,
      actor_role: (req as AuthRequest).user!.role,
      action: 'disapprove_request',
      resource_type: 'delivery_requests',
      resource_id: id as string,
      new_values: { status: 'disapproved', delivery_status, admin_remark },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    const io = req.app.get('io');
    if (io) {
      // TARGETED WHISPERING: Only notify Admins and the specific requester.
      io.to('admin-room').to(requester_id).emit('request-updated', { request_id: id, status: 'disapproved' });
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
    if (status !== 'pending' && status !== 'submitted_waiting' && status !== 'returned_for_revision') {
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

    await publishDeliveryNotification(req.app.get('io'), {
      id: notifId, user_id: requester_id, message: msg,
      type: 'request_revision', request_id: String(id),
    });

    const io = req.app.get('io');
    if (io) {
      // TARGETED WHISPERING: Only notify Admins and the specific requester.
      io.to('admin-room').to(requester_id).emit('request-updated', { request_id: id, status: 'returned_for_revision' });
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
      // TARGETED WHISPERING: Only notify Admins and the specific requester.
      io.to('admin-room').to(user.id).emit('request-updated', { request_id: id, status: 'pending', delivery_status: 'pending' });
    }

    try {
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
        await publishDeliveryNotification(io, {
          id: notifId, user_id: admin.id, message: msg,
          type: 'request_submitted', request_id: String(id),
        });
      }
    } catch {
      console.error('[REQUEST] Unable to save Admin resubmission notifications.');
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
      'SELECT status, delivery_status, assigned_rider_id, requester_id FROM delivery_requests WHERE request_id = ? FOR UPDATE',
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

    const isAdminUpdate = user.role === 'admin';
    const auditRemark = isAdminUpdate
      ? `[Admin update by ${user.email || user.id}] ${remark || `Status updated to ${status}`}`
      : remark || `Status updated to ${status}`;

    let query = 'UPDATE delivery_requests SET delivery_status = ?, rider_remark = ?';
    let params: any[] = [status, auditRemark];

    if (status === 'completed' || status === 'failed') {
      query += ', completed_at = ?';
      params.push(timestamp ? new Date(timestamp) : new Date());
    }
    if (status === 'failed') {
      query += ', failed_at = ?, overdue_at = CASE WHEN scheduled_end_at < ? THEN COALESCE(overdue_at, scheduled_end_at) ELSE overdue_at END';
      const serverNow = new Date();
      params.push(serverNow, serverNow);
    }

    if (current_lat !== undefined && current_lng !== undefined) {
      query += ', current_lat = ?, current_lng = ?';
      params.push(current_lat, current_lng);
    }

    query += ' WHERE request_id = ?';
    params.push(id);

    await connection.query(query, params);

    // 1. Status Log Entry (Internal logic)
    await connection.query(
      'INSERT INTO status_logs (request_id, rider_id, status, remark) VALUES (?, ?, ?, ?)',
      [id, current.assigned_rider_id || user.id, status, auditRemark]
    );

    const deliveryEventNotifications: Awaited<ReturnType<typeof persistDeliveryNotification>>[] = [];
    const normalizedDeliveryStatus = String(status).toLowerCase();
    const isDeliveryStartEvent = normalizedDeliveryStatus === 'in_progress';
    const isDeliveryArrivalEvent = ['arrived', 'arrived_at_pickup', 'arrived_at_dropoff'].includes(normalizedDeliveryStatus);
    if ((isDeliveryStartEvent || isDeliveryArrivalEvent) && current.requester_id) {
      const eventType = isDeliveryStartEvent ? 'delivery_started' : 'delivery_arrival';
      const eventMessage = isDeliveryStartEvent
        ? `Delivery #${String(id).slice(-6).toUpperCase()} is on the way.`
        : `Delivery #${String(id).slice(-6).toUpperCase()} has reached ${normalizedDeliveryStatus === 'arrived_at_dropoff' ? 'the destination' : 'a delivery stop'}.`;
      const [adminRows]: any = await connection.query('SELECT id FROM users WHERE role = ?', ['admin']);
      const recipients = [...new Set([current.requester_id, ...(adminRows || []).map((admin: any) => admin.id)])]
        .filter((recipientId) => recipientId && recipientId !== user.id);
      for (const recipientId of recipients) {
        deliveryEventNotifications.push(await persistDeliveryNotification(connection, {
          recipientId, requestId: String(id), type: eventType, message: eventMessage,
        }));
      }
    }

    // 2. AUDIT LOG (Phase 3.2 Hardening)
    logAction({
      actor_id: user.id,
      actor_role: user.role,
      action: 'update_status',
      resource_type: 'delivery_requests',
      resource_id: id as string,
      old_values: { status: current.status, delivery_status: current.delivery_status },
      new_values: { delivery_status: status, remark, timestamp },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    await connection.commit();

    // --- SENIOR FIX: REAL-TIME BROADCAST & NOTIFICATIONS ---
    const io = req.app.get('io');
    if (io) {
      for (const notification of deliveryEventNotifications) {
        await publishDeliveryNotification(io, notification);
      }
      // 2. TARGETED WHISPERING: Notify admin, requester, and assigned rider
      io.to('admin-room')
        .to(current.requester_id)
        .to(current.assigned_rider_id)
        .to(`job_${id}`)
        .emit('delivery-status-updated', { request_id: id, status, remark, actor_role: user.role });

      io.to('admin-room')
        .to(current.requester_id)
        .to(current.assigned_rider_id)
        .to(`job_${id}`)
        .emit('request-updated', { request_id: id, status: 'approved', delivery_status: status, actor_role: user.role });

      io.to(`job_${id}`).emit('job-status-changed', { request_id: id, status, message: remark, actor_role: user.role });

      // 3. Create Formal Notifications for Terminal States (Completed/Failed)
      if (['completed', 'failed', 'delivered'].includes(status)) {
        try {
          const [details]: any = await pool.query(
            'SELECT requester_id, requester_name, assigned_rider_id, assigned_rider_name FROM delivery_requests WHERE request_id = ?',
            [id]
          );
          
          if (details.length > 0) {
            const { requester_id, assigned_rider_id, assigned_rider_name } = details[0];
            const type = status === 'failed' ? 'delivery_failed' : 'delivery_completed';
            const actorName = isAdminUpdate ? 'the admin' : (assigned_rider_name || 'the rider');
            const msg = `Delivery #${String(id).slice(-6).toUpperCase()} has been marked as ${status.toUpperCase()} by ${actorName}${remark ? `: ${remark}` : '.'}`;

            // A. Notify Requester (Personnel)
            const notifIdP = `notif_${Date.now()}_p_${Math.random().toString(36).substring(7)}`;
            await pool.query(
              'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
              [notifIdP, requester_id, msg, type, id]
            );
            io.to(requester_id).emit('notification-added', { id: notifIdP, message: msg, type, request_id: id });

            // B. Notify the assigned rider when an admin closes the transaction remotely.
            if (isAdminUpdate && assigned_rider_id) {
              const riderMsg = status === 'failed'
                ? 'Transaction marked as failed by the admin.'
                : 'Transaction marked as complete by the admin.';
              const riderNotifId = `notif_${Date.now()}_r_${Math.random().toString(36).substring(7)}`;
              await pool.query(
                'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
                [riderNotifId, assigned_rider_id, riderMsg, type, id]
              );
              io.to(assigned_rider_id).emit('notification-added', {
                id: riderNotifId,
                message: riderMsg,
                type,
                request_id: id,
                actor_role: user.role
              });
            }

            // C. Notify All Admins
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

// GET /api/requests/:id/timeline - Fetch movement timeline events
router.get('/:id/timeline', authorize(['admin', 'personnel', 'rider']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // BOLA Check
    const [rows]: any = await pool.query('SELECT requester_id, requester_department, assigned_rider_id, delivery_status, created_at, completed_at, updated_at FROM delivery_requests WHERE request_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    
    const request = rows[0];
    const isAuthorized = user.role === 'admin' || 
                       request.requester_id === user.id || 
                       (user.department && request.requester_department === user.department) ||
                       request.assigned_rider_id === user.id;

    if (!isAuthorized) return res.status(403).json({ error: 'Forbidden' });

    const terminalStatuses = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];
    const isTerminal = terminalStatuses.includes(request.delivery_status);

    let events;
    if (isTerminal) {
      // TEMPORAL BOUNDING for "Done" tasks: Only show events directly attached to this specific task.
      // We exclude global shift events (duty_on/off) from historical tasks to prevent duplicate clutter.
      [events] = await pool.query(
        `SELECT id, event_type, message, metadata, timestamp 
         FROM movement_events 
         WHERE request_id = ? 
         ORDER BY timestamp ASC`,
        [id]
      );
    } else {
      // Standard query for Active tasks (shows current shift status + active job events)
      [events] = await pool.query(
        'SELECT id, event_type, message, metadata, timestamp FROM movement_events WHERE request_id = ? OR (rider_id = ? AND request_id IS NULL) ORDER BY timestamp ASC',
        [id, request.assigned_rider_id]
      );
    }

    res.json(events);
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * POST /api/requests/mass-update
 * Batch reassign or reschedule requests (Conflict Resolution)
 * Notifies both Rider and Personnel
 */
router.post('/mass-update', authorize(['admin']), async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  const notificationsToPublish: Array<{ notification: Awaited<ReturnType<typeof persistDeliveryNotification>>; push?: { title: string; body: string; data: Record<string, unknown>; channelId: 'delivery_updates' | 'delivery_urgent'; categoryId?: string; tag?: string } }> = [];
  try {
    const { taskIds, action, value } = req.body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs are required' });
    }

    await conn.beginTransaction();

    if (action === 'reassign' || action === 'approve') {
      const riderId = value;
      const { note, sequence } = req.body;
      const [riderRows] = await conn.query('SELECT name FROM users WHERE id = ?', [riderId]) as any[];
      if (riderRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Rider not found' });
      }
      const riderName = riderRows[0].name;
      const [initialTaskRows] = await conn.query(
        'SELECT request_id, status, delivery_status, delivery_date, requester_id, assigned_rider_id, pickup_address, dropoff_address, recipient_contact, dropoff_lat, dropoff_lng FROM delivery_requests WHERE request_id IN (?)',
        [taskIds]
      ) as any[];
      if (initialTaskRows.length !== new Set(taskIds.map(String)).size || taskIds.length !== new Set(taskIds.map(String)).size) {
        await conn.rollback();
        return res.status(409).json({ error: 'One or more requests changed or were not found.', code: 'QUEUE_CHANGED' });
      }
      const sourceRiderIds: string[] = Array.from(new Set<string>(initialTaskRows
        .map((task: any) => task.assigned_rider_id)
        .filter((id: any) => id && String(id) !== String(riderId))
        .map((id: unknown) => String(id))));
      await lockRiderQueues(conn, [...sourceRiderIds, String(riderId)]);

      const [taskRows] = await conn.query(
        'SELECT request_id, status, delivery_status, delivery_date, requester_id, assigned_rider_id, pickup_address, dropoff_address, recipient_contact, dropoff_lat, dropoff_lng FROM delivery_requests WHERE request_id IN (?) FOR UPDATE',
        [taskIds]
      ) as any[];
      const initialById = new Map<string, any>(initialTaskRows.map((task: any) => [String(task.request_id), task]));
      if (taskRows.length !== initialTaskRows.length || taskRows.some((task: any) => {
        const initial = initialById.get(String(task.request_id));
        return !initial || String(initial.assigned_rider_id || '') !== String(task.assigned_rider_id || '') ||
          initial.status !== task.status || initial.delivery_status !== task.delivery_status;
      })) {
        await conn.rollback();
        return res.status(409).json({ error: 'Requests changed while assignment was being prepared.', code: 'QUEUE_CHANGED' });
      }
      const requestedIds: string[] = taskIds.map((id: unknown) => String(id));
      if (sequence !== undefined && !Array.isArray(sequence)) {
        await conn.rollback();
        return res.status(409).json({ error: 'Submitted order must contain every selected request exactly once.', code: 'QUEUE_CHANGED' });
      }
      const validatedSubmittedOrder: string[] = Array.isArray(sequence)
        ? sequence.map((id: unknown) => String(id))
        : requestedIds;
      const requestedIdSet = new Set(requestedIds);
      if (validatedSubmittedOrder.length !== requestedIds.length ||
        new Set(validatedSubmittedOrder).size !== requestedIdSet.size ||
        validatedSubmittedOrder.some((id) => !requestedIdSet.has(id))) {
        await conn.rollback();
        return res.status(409).json({ error: 'Submitted order must contain every selected request exactly once.', code: 'QUEUE_CHANGED' });
      }
      const terminalStatuses = new Set(['completed', 'delivered', 'failed', 'cancelled', 'disapproved']);
      if (taskRows.some((task: any) => terminalStatuses.has(task.status) || terminalStatuses.has(task.delivery_status))) {
        await conn.rollback();
        return res.status(409).json({ error: 'Terminal requests cannot be assigned.', code: 'QUEUE_CHANGED' });
      }
      if (action === 'approve' && taskRows.some((task: any) =>
        !['pending', 'submitted_waiting'].includes(String(task.status)) || task.assigned_rider_id,
      )) {
        await conn.rollback();
        return res.status(409).json({ error: 'A selected request is no longer pending assignment.', code: 'QUEUE_CHANGED' });
      }
      const availabilityIssue = await getRiderAvailabilityIssue(conn, riderId, taskRows.map((task: any) => task.delivery_date));
      if (availabilityIssue) {
        await conn.rollback();
        return res.status(availabilityIssue.code === 'RIDER_NOT_FOUND' ? 404 : 409).json({
          error: availabilityIssue.code === 'RIDER_NOT_FOUND'
            ? availabilityIssue.message
            : `Cannot assign these requests: ${availabilityIssue.message}`,
          code: availabilityIssue.code,
        });
      }

      const targetRiderTaskIds = taskRows
        .filter((task: any) => action === 'approve' || String(task.assigned_rider_id || '') !== String(riderId))
        .map((task: any) => String(task.request_id));
      if (targetRiderTaskIds.length === 0) {
        await conn.commit();
        return res.json({ success: true, message: 'Tasks are already assigned to this rider.' });
      }
      const changedTaskIds = new Set(targetRiderTaskIds);

      for (const id of targetRiderTaskIds) {
        const details = (taskRows as any[]).find((task) => String(task.request_id) === String(id));
        await conn.query(`
          UPDATE delivery_requests 
          SET assigned_rider_id = ?, 
              assigned_rider_name = ?, 
              queue_order = NULL,
              status = 'approved', 
              delivery_status = CASE 
                WHEN delivery_status IN ('in_progress', 'arrived', 'picked_up', 'arrived_at_pickup', 'arrived_at_dropoff') THEN delivery_status
                ELSE 'assigned'
              END,
              admin_remark = ?, 
              approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE request_id = ?
        `, [riderId, riderName, note || null, id]);

        const shortId = String(id).slice(-6).toUpperCase();
        
        // 1. Notify Rider
        const assignmentMessage = `Task #${shortId} assigned to ${riderName}.`;
        const riderNotification = await persistDeliveryNotification(conn, {
          recipientId: riderId, requestId: String(id), message: assignmentMessage, type: 'new_assignment',
        });
        notificationsToPublish.push({
          notification: riderNotification,
          push: {
            title: 'New delivery task assigned',
            body: details?.pickup_address && details?.dropoff_address
              ? `${assignmentMessage} ${details.pickup_address} → ${details.dropoff_address}` : assignmentMessage,
            data: {
              request_id: id, type: 'new_assignment',
              ...(details?.recipient_contact ? { recipient_contact: details.recipient_contact } : {}),
              ...(details?.dropoff_lat != null ? { dropoff_lat: details.dropoff_lat } : {}),
              ...(details?.dropoff_lng != null ? { dropoff_lng: details.dropoff_lng } : {}),
            },
            channelId: 'delivery_updates',
            categoryId: details?.recipient_contact && details?.dropoff_lat != null && details?.dropoff_lng != null
              ? 'DELIVERY_TASK_CALL_MAP' : details?.recipient_contact ? 'DELIVERY_TASK_CALL'
                : details?.dropoff_lat != null && details?.dropoff_lng != null ? 'DELIVERY_TASK_MAP' : 'DELIVERY_TASK',
            tag: `delivery:${id}:assignment`,
          },
        });
        if (details?.assigned_rider_id && details.assigned_rider_id !== riderId) {
          const oldRiderMessage = `Delivery #${shortId} has been reassigned.`;
          const oldRiderNotification = await persistDeliveryNotification(conn, {
            recipientId: details.assigned_rider_id, requestId: String(id), message: oldRiderMessage, type: 'assignment_cancelled',
          });
          notificationsToPublish.push({
            notification: oldRiderNotification,
            push: {
              title: 'Delivery assignment updated', body: oldRiderMessage,
              data: { request_id: id, type: 'assignment_cancelled' }, channelId: 'delivery_updates',
              tag: `delivery:${id}:assignment_cancelled`,
            },
          });
          const adminCancellationNotifications = await persistAdminDispatchNotifications(conn, {
            requestId: String(id),
            type: 'assignment_cancelled',
            message: `An assignment for request #${shortId} was cancelled. Review dispatch.`,
          });
          for (const notification of adminCancellationNotifications) {
            notificationsToPublish.push({ notification });
          }
        }
        if (details?.requester_id) {
          const requesterNotification = await persistDeliveryNotification(conn, {
            recipientId: details.requester_id, requestId: String(id),
            message: `Delivery #${shortId} has been assigned to ${riderName}.`, type: 'request_approved',
          });
          notificationsToPublish.push({ notification: requesterNotification });
        }

        // 2. Timeline Event
        const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await conn.query(
          "INSERT INTO movement_events (id, request_id, rider_id, event_type, message) VALUES (?, ?, ?, ?, ?)",
          [eventId, id, riderId, 'assignment', `Batch Approved.`]
        );
      }

      for (const sourceRiderId of sourceRiderIds) await normalizeRiderQueueOrder(conn, sourceRiderId);
      const submittedOrder = validatedSubmittedOrder.filter((id) => changedTaskIds.has(id));
      await appendRequestsToRiderQueue(conn, String(riderId), targetRiderTaskIds, submittedOrder);
    } else if (action === 'reschedule') {
      const newDate = value; // YYYY-MM-DD
      
      // Fetch details for notifications
      const [initialDetails]: any = await conn.query(
        'SELECT request_id, requester_id, assigned_rider_id, status, delivery_status FROM delivery_requests WHERE request_id IN (?)',
        [taskIds]
      );
      if (initialDetails.length !== new Set(taskIds.map(String)).size || taskIds.length !== new Set(taskIds.map(String)).size) {
        await conn.rollback();
        return res.status(409).json({ error: 'One or more requests changed or were not found.', code: 'QUEUE_CHANGED' });
      }
      const previousRiderIds: string[] = Array.from(new Set<string>(initialDetails
        .map((row: any) => row.assigned_rider_id)
        .filter(Boolean)
        .map((id: unknown) => String(id))));
      await lockRiderQueues(conn, previousRiderIds);
      const [details]: any = await conn.query(
        'SELECT request_id, requester_id, assigned_rider_id, status, delivery_status FROM delivery_requests WHERE request_id IN (?) FOR UPDATE',
        [taskIds]
      );
      const initialAssignments = new Map<string, any>(initialDetails.map((row: any) => [String(row.request_id), row]));
      if (details.length !== initialDetails.length || details.some((row: any) =>
        !initialAssignments.has(String(row.request_id)) ||
        String(initialAssignments.get(String(row.request_id)).assigned_rider_id || '') !== String(row.assigned_rider_id || '') ||
        initialAssignments.get(String(row.request_id)).status !== row.status ||
        initialAssignments.get(String(row.request_id)).delivery_status !== row.delivery_status,
      )) {
        await conn.rollback();
        return res.status(409).json({ error: 'Requests changed while rescheduling was being prepared.', code: 'QUEUE_CHANGED' });
      }

      await conn.query(`
        UPDATE delivery_requests 
        SET delivery_date = ?, assigned_rider_id = NULL, assigned_rider_name = NULL, queue_order = NULL, status = 'pending', delivery_status = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE request_id IN (?)
      `, [newDate, taskIds]);

      for (const previousRiderId of previousRiderIds) await normalizeRiderQueueOrder(conn, previousRiderId);

      for (const row of details) {
        const id = row.request_id;
        const shortId = String(id).slice(-6).toUpperCase();
        const requesterNotification = await persistDeliveryNotification(conn, {
          recipientId: row.requester_id, requestId: String(id),
          message: `Your request #${shortId} has been rescheduled to ${newDate}. Please check your dashboard.`, type: 'info',
        });
        notificationsToPublish.push({ notification: requesterNotification });
        if (row.assigned_rider_id) {
          const riderMessage = `Delivery #${shortId} has been rescheduled and is no longer assigned to you.`;
          const riderNotification = await persistDeliveryNotification(conn, {
            recipientId: row.assigned_rider_id, requestId: String(id), message: riderMessage, type: 'assignment_cancelled',
          });
          notificationsToPublish.push({
            notification: riderNotification,
            push: { title: 'Delivery arrangement updated', body: riderMessage,
              data: { request_id: id, type: 'assignment_cancelled' }, channelId: 'delivery_updates',
              tag: `delivery:${id}:rescheduled` },
          });
          const adminCancellationNotifications = await persistAdminDispatchNotifications(conn, {
            requestId: String(id),
            type: 'assignment_cancelled',
            message: `An assignment for request #${shortId} was cancelled. Review dispatch.`,
          });
          for (const notification of adminCancellationNotifications) {
            notificationsToPublish.push({ notification });
          }
        }
      }
    } else {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid action' });
    }

    await conn.commit();
    const io = req.app.get('io');
    for (const item of notificationsToPublish) {
      await publishDeliveryNotification(io, item.notification, item.push ? { push: { ...item.push, send: sendPushNotification } } : undefined);
    }
    res.json({ success: true, message: `Successfully updated ${taskIds.length} tasks` });
  } catch (error) {
    await conn.rollback();
    console.error('Mass update error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    conn.release();
  }
});

// POST /api/requests/:id/deviation - Layer 2 Rider Deviation Request
router.post('/:id/deviation', authorize(['rider']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, photoUrl, currentPos } = req.body;
    const user = req.user!;
    const io = req.app.get('io');

    // 1. Verify ownership
    const [rows]: any = await pool.query("SELECT assigned_rider_id FROM delivery_requests WHERE request_id = ?", [id]);
    if (rows.length === 0 || rows[0].assigned_rider_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2. Log the event
    const eventId = `ev_dev_req_${Date.now()}`;
    await pool.query(
      "INSERT INTO movement_events (id, request_id, rider_id, event_type, message, metadata) VALUES (?, ?, ?, ?, ?, ?)",
      [eventId, id, user.id, 'deviation_requested', `Rider requested sequence skip: ${reason}`, JSON.stringify({ reason, photoUrl, sequencePos: currentPos, riderName: user.name, requestId: id })]
    );

    const adminNotifications = await persistAdminDispatchNotifications(pool, {
      requestId: String(id),
      type: 'deviation_requested',
      message: `A rider requested a route deviation for #${String(id).slice(-6).toUpperCase()}.`,
    });
    for (const notification of adminNotifications) {
      await publishDeliveryNotification(io, notification);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit deviation' });
  }
});

router.post('/resequence', authorize(['admin']), validate(resequenceSchema), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const { riderId, sequence, note } = req.body;
    const user = req.user!;
    let routeNotification: Awaited<ReturnType<typeof persistDeliveryNotification>> | null = null;
    await conn.beginTransaction();

    // 1. Validate and persist an exact replacement of the authoritative active queue.
    await replaceRiderQueueOrder(conn, riderId, sequence);

    // 2. Discipline Audit Log (Layer 4 integration)
    const eventId = `ev_reseq_${Date.now()}`;
    await conn.query(
      "INSERT INTO movement_events (id, rider_id, event_type, message) VALUES (?, ?, ?, ?)",
      [eventId, riderId, 'route_optimized', `Admin re-ordered sequence. Note: ${note || 'N/A'}`]
    );

    if (sequence.length > 0) {
      routeNotification = await persistDeliveryNotification(conn, {
        recipientId: riderId,
        requestId: String(sequence[0]),
        type: 'route_optimization',
        message: 'Your delivery order has changed. Review your updated route.',
      });
    }

    await conn.commit();

    // 3. SYSTEM AUDIT LOG (Layer 3.2 Hardening)
    logAction({
      actor_id: user.id,
      actor_role: user.role,
      action: 'resequence_requests',
      resource_type: 'rider_queue',
      resource_id: riderId,
      new_values: { sequence, note },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // 4. INSTANT SYNC: Notify Rider (Mobile) and Admin room
    const io = req.app.get('io');
    if (io) {
      if (routeNotification) {
        await publishDeliveryNotification(io, routeNotification, {
          push: {
            send: sendPushNotification,
            title: 'Delivery order updated',
            body: routeNotification.message,
            data: { request_id: routeNotification.request_id, type: 'route_optimization' },
            channelId: 'delivery_updates',
            tag: `rider:${riderId}:route-optimization`,
          },
        });
      }
      io.to(riderId).emit('requests-updated', { 
        message: "📍 Route Updated: Admin has optimized your delivery sequence.",
        type: 'route_optimization'
      });
      io.to('admin-room').emit('requests-updated');
    }

    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    if (error instanceof RiderQueueValidationError) {
      return res.status(409).json({ error: error.message, code: 'QUEUE_CHANGED' });
    }
    console.error('Resequence error:', error);
    res.status(500).json({ error: 'Database error during resequence' });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
