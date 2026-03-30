import { Router } from 'express';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { createRequestSchema, approveRequestSchema, updateStatusSchema } from '../schemas/requestSchema';
// @ts-ignore
import webpush from 'web-push';

const router = Router();

// Configure Web Push with VAPID keys
webpush.setVapidDetails(
  'mailto:admin@company.com',
  'BCXzd-f_1CJ033WPwGsbJ1Rovf2yToy43VCA0uoi45_DCV91pmkeroipCr8GVeaKVNmJ9R0k2jL0eBhcWIzLGfE',
  'x2EhA5k0QsYrot0-xuJpZXA7MMvrzb6jGF7yGukGCVo'
);

// Get availability/occupancy for a specific date
router.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    // Count requests that are taking up capacity (anything not terminal)
    // We include submitted_waiting, pending, approved, assigned
    const [rows] = await pool.query(`
      SELECT time_window, COUNT(*) as count 
      FROM delivery_requests 
      WHERE delivery_date = ? 
      AND status IN ('pending', 'approved', 'assigned', 'submitted_waiting')
      AND (delivery_status IS NULL OR delivery_status NOT IN ('completed', 'failed', 'cancelled'))
      GROUP BY time_window
    `, [date]);

    res.json(rows);
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all requests with optional filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { rider_id, delivery_status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = 'SELECT * FROM delivery_requests';
    let countQuery = 'SELECT COUNT(*) as total FROM delivery_requests';
    const params: any[] = [];
    const conditions: string[] = [];

    if (rider_id) {
      conditions.push('assigned_rider_id = ?');
      params.push(rider_id);
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
    
    const total = (countRows as any[])[0].total;
    const requests = (rows as any[]).map(row => ({
      ...row,
      pickup_location: {
        lat: row.pickup_lat,
        lng: row.pickup_lng,
        address: row.pickup_address,
        businessName: row.pickup_business_name,
        landmarks: row.pickup_landmarks
      },
      dropoff_location: {
        lat: row.dropoff_lat,
        lng: row.dropoff_lng,
        address: row.dropoff_address,
        businessName: row.dropoff_business_name,
        landmarks: row.dropoff_landmarks
      },
      current_location: row.current_lat && row.current_lng ? {
        lat: row.current_lat,
        lng: row.current_lng
      } : null,
      exceptions: row.exceptions ? (typeof row.exceptions === 'string' ? JSON.parse(row.exceptions) : row.exceptions) : []
    }));

    res.json({
      data: requests,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get a single request by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM delivery_requests WHERE request_id = ?', [id]);
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const row = (rows as any[])[0];
    const request = {
      ...row,
      pickup_location: {
        lat: row.pickup_lat,
        lng: row.pickup_lng,
        address: row.pickup_address,
        businessName: row.pickup_business_name,
        landmarks: row.pickup_landmarks
      },
      dropoff_location: {
        lat: row.dropoff_lat,
        lng: row.dropoff_lng,
        address: row.dropoff_address,
        businessName: row.dropoff_business_name,
        landmarks: row.dropoff_landmarks
      },
      current_location: row.current_lat && row.current_lng ? {
        lat: row.current_lat,
        lng: row.current_lng
      } : null
    };
    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new request
router.post('/', validate(createRequestSchema), async (req, res) => {
  try {
    const {
      requester_id, requester_name, requester_department,
      delivery_date, time_window, pickup_location, dropoff_location,
      pickup_contact_name, pickup_contact_mobile,
      recipient_name, recipient_contact, request_type, urgency_level, on_behalf_of,
      personnel_instructions, admin_remark
    } = req.body;

    const request_id = `req_${Date.now()}`;

    // Set initial status to submitted_waiting for the 60-second cancellation window
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
      pickup_location.lat,
      pickup_location.lng,
      pickup_location.address,
      pickup_location.businessName || null,
      pickup_location.landmarks || null,
      dropoff_location.lat,
      dropoff_location.lng,
      dropoff_location.address,
      dropoff_location.businessName || null,
      dropoff_location.landmarks || null,
      pickup_contact_name || null, 
      pickup_contact_mobile || null,
      recipient_name, 
      recipient_contact,
      request_type, 
      urgency_level, 
      personnel_instructions || null, 
      on_behalf_of || null, 
      admin_remark || null,
    ]);

    const [rows] = await pool.query('SELECT * FROM delivery_requests WHERE request_id = ?', [request_id]);
    const newRequest = (rows as any[])[0];

    // SCHEDULE ADMIN NOTIFICATION AFTER 60 SECONDS
    setTimeout(async () => {
      try {
        // Check if the request still exists and is still in 'submitted_waiting' status
        const [currentStatusRows] = await pool.query('SELECT status FROM delivery_requests WHERE request_id = ?', [request_id]) as any[];
        
        if (currentStatusRows && currentStatusRows[0]?.status === 'submitted_waiting') {
          // 1. Update status to 'pending' (now visible to admin)
          await pool.query('UPDATE delivery_requests SET status = ? WHERE request_id = ?', ['pending', request_id]);

          // 2. Get all admin user IDs
          const [admins] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
          
          const notifMessage = `New request from ${requester_name} (${requester_department})`;
          const io = req.app.get('io');

          for (const admin of admins) {
            const notifId = `notif_${Date.now()}_1_${Math.random().toString(36).substring(2, 9)}`;
            
            // Insert into DB
            await pool.query(`
              INSERT INTO notifications (id, user_id, message, type, request_id)
              VALUES (?, ?, ?, ?, ?)
            `, [notifId, admin.id, notifMessage, 'request_submitted', request_id]);

            // Emit Real-time Event
            if (io) {
              io.to(admin.id).emit('notification-added', { 
                id: notifId, 
                message: notifMessage, 
                type: 'request_submitted', 
                request_id 
              });
              // Also ensure admin dashboard list updates
              io.to(admin.id).emit('request-updated'); 
            }
          }
          
          // Notify the original requester so their UI updates to 'pending'
          if (io) {
            io.to(requester_id).emit('request-updated', { request_id, status: 'pending' });
          }
        }
      } catch (err) {
        console.error('Error in delayed admin notification:', err);
      }
    }, 60000); // 60-second delay

    res.json(newRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Cancel a request (within the 60-second window)
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the request is still in the 'submitted_waiting' status
    const [rows] = await pool.query('SELECT status, requester_id FROM delivery_requests WHERE request_id = ?', [id]) as any[];
    
    if (!rows || rows[0]?.status !== 'submitted_waiting') {
      return res.status(400).json({ error: 'Request cannot be cancelled as it is already being processed.' });
    }

    await pool.query(`
      UPDATE delivery_requests 
      SET status = 'cancelled'
      WHERE request_id = ?
    `, [id]);

    const io = req.app.get('io');
    if (io) {
      io.to(rows[0].requester_id).emit('request-updated', { request_id: id, status: 'cancelled' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});
// Approve a request (using a Database Transaction)
router.put('/:id/approve', validate(approveRequestSchema), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { rider_id, admin_remark } = req.body;
    
    // Start the transaction
    await connection.beginTransaction();

    // 0. Check current status for idempotency
    const [existingRows] = await connection.query('SELECT status, assigned_rider_id FROM delivery_requests WHERE request_id = ?', [id]);
    const existing = (existingRows as any[])[0];

    if (existing && existing.status === 'approved' && existing.assigned_rider_id === rider_id) {
        await connection.rollback();
        return res.json({ success: true, message: 'Already approved and assigned to this rider' });
    }

    const [riderRows] = await connection.query('SELECT name, push_subscription FROM users WHERE id = ?', [rider_id]);
    const rider = (riderRows as any[])[0];
    const riderName = rider?.name || 'Unknown Rider';
    const riderPushSubscription = rider?.push_subscription;

    // 1. Update the delivery request
    await connection.query(`
      UPDATE delivery_requests 
      SET status = 'approved', assigned_rider_id = ?, assigned_rider_name = ?, admin_remark = ?, delivery_status = 'assigned'
      WHERE request_id = ?
    `, [rider_id, riderName, admin_remark, id]);

    // Fetch the request data needed for notifications
    const [reqRows] = await connection.query('SELECT requester_id, delivery_date, time_window FROM delivery_requests WHERE request_id = ?', [id]) as any;
    const requestData = (reqRows as any[])[0];

    if (requestData) {
      // 2. Create notification for the personnel who requested it
      const notifId1 = `notif_${Date.now()}_1_${Math.random().toString(36).substring(2, 9)}`;
      await connection.query(`
        INSERT INTO notifications (id, user_id, message, type, request_id)
        VALUES (?, ?, ?, ?, ?)
      `, [notifId1, requestData.requester_id, `Your delivery request for ${requestData.delivery_date} has been approved. Rider: ${riderName}`, 'request_approved', id]);

      // 3. Create notification for the assigned rider
      const notifId2 = `notif_${Date.now()}_2_${Math.random().toString(36).substring(2, 9)}`;
      await connection.query(`
        INSERT INTO notifications (id, user_id, message, type, request_id)
        VALUES (?, ?, ?, ?, ?)
      `, [notifId2, rider_id, `New delivery assigned for ${requestData.delivery_date} at ${requestData.time_window}`, 'rider_assigned', id]);
    }
    
    // Commit the transaction (save all changes permanently)
    await connection.commit();

    // 4. Send Smart Push Notification (Outside of transaction to avoid timeout issues)
    if (riderPushSubscription && requestData) {
        try {
            const payload = JSON.stringify({
                title: 'New Task Assigned! 📦',
                body: `Scheduled for ${requestData.delivery_date} at ${requestData.time_window}`,
                icon: '/pwa-192x192.png',
                data: { url: '/rider-dashboard' }
            });
            await webpush.sendNotification(riderPushSubscription, payload);
        } catch (pushErr) {
            console.error('Error sending push notification:', pushErr);
        }
    }

    // 5. Trigger Instant Mobile Refresh & Personnel Update via Socket.io
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting new_assignment to rider: ${rider_id}`);
      io.to(rider_id).emit('new_assignment', {
        request_id: id,
        message: 'A new task has been assigned to you.'
      });

      // Also notify the original requester so their dashboard updates instantly
      console.log(`📡 Emitting request-updated to requester: ${requestData.requester_id}`);
      io.to(requestData.requester_id).emit('request-updated', {
        request_id: id,
        status: 'approved'
      });

      // BROADCAST to the specific job room (for Mobile App sync)
      io.to(`job_${id}`).emit('job-status-changed', {
        requestId: id,
        status: 'assigned',
        updatedBy: 'admin',
        message: 'A rider has been assigned to this task.'
      });
    }

    res.json({ success: true, riderName });
    
  } catch (error) {
    // If any query above failed, undo all changes made in this transaction
    await connection.rollback();
    console.error("Transaction failed, rolling back:", error);
    res.status(500).json({ error: 'Database transaction error' });
  } finally {
    // Always release the connection back to the pool
    connection.release();
  }
});

// Disapprove a request
router.put('/:id/disapprove', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_remark } = req.body;

    // Check current status for idempotency
    const [existingRows] = await pool.query('SELECT status FROM delivery_requests WHERE request_id = ?', [id]) as any[];
    if (existingRows && existingRows[0]?.status === 'disapproved') {
      return res.json({ success: true, message: 'Already disapproved' });
    }

    await pool.query(`
      UPDATE delivery_requests 
      SET status = 'disapproved', admin_remark = ?
      WHERE request_id = ?
    `, [admin_remark, id]);

    // Fetch the requester ID to send notification
    const [rows] = await pool.query('SELECT requester_id, delivery_date FROM delivery_requests WHERE request_id = ?', [id]) as any[];
    const requestData = rows[0];

    if (requestData) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const message = `Your request for ${requestData.delivery_date} has been disapproved. Reason: ${admin_remark}`;
      
      await pool.query(`
        INSERT INTO notifications (id, user_id, message, type, request_id)
        VALUES (?, ?, ?, ?, ?)
      `, [notifId, requestData.requester_id, message, 'request_disapproved', id]);

      const io = req.app.get('io');
      if (io) {
        io.to(requestData.requester_id).emit('notification-added', { id: notifId, message, type: 'request_disapproved', request_id: id });
        io.to(requestData.requester_id).emit('request-updated', { request_id: id, status: 'disapproved' });
        
        // BROADCAST to the specific job room (for Mobile App sync)
        io.to(`job_${id}`).emit('job-status-changed', {
          requestId: id,
          status: 'disapproved',
          updatedBy: 'admin',
          message: 'This request has been disapproved by the administrator.'
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Return a request for revision
router.put('/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_remark } = req.body;

    if (!admin_remark) {
      return res.status(400).json({ error: 'Admin remark is required for revisions' });
    }

    // Check current status
    const [existingRows] = await pool.query('SELECT status FROM delivery_requests WHERE request_id = ?', [id]) as any[];
    if (existingRows && existingRows[0]?.status === 'returned_for_revision') {
      return res.json({ success: true, message: 'Already returned' });
    }

    await pool.query(`
      UPDATE delivery_requests 
      SET status = 'returned_for_revision', admin_remark = ?
      WHERE request_id = ?
    `, [admin_remark, id]);

    // Log the status change
    await pool.query(`
      INSERT INTO status_logs (request_id, status, remark)
      VALUES (?, 'returned_for_revision', ?)
    `, [id, admin_remark]);

    // Fetch the requester ID to send notification
    const [rows] = await pool.query('SELECT requester_id, delivery_date FROM delivery_requests WHERE request_id = ?', [id]) as any;
    const requestData = rows[0];

    if (requestData) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const message = `Your request for ${requestData.delivery_date} requires revision. Admin Remark: ${admin_remark}`;

      await pool.query(`
        INSERT INTO notifications (id, user_id, message, type, request_id)
        VALUES (?, ?, ?, ?, ?)
      `, [notifId, requestData.requester_id, message, 'request_returned', id]);

      const io = req.app.get('io');
      if (io) {
        io.to(requestData.requester_id).emit('notification-added', { id: notifId, message, type: 'request_returned', request_id: id });
        io.to(requestData.requester_id).emit('request-updated', { request_id: id, status: 'returned_for_revision' });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Resubmit a corrected request
router.put('/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_date,
      time_window,
      pickup_location,
      dropoff_location,
      pickup_contact_name,
      pickup_contact_mobile,
      recipient_name,
      recipient_contact,
      request_type,
      urgency_level,
      on_behalf_of,
      personnel_instructions
    } = req.body;

    await pool.query(`
      UPDATE delivery_requests 
      SET 
        delivery_date = ?, 
        time_window = ?, 
        pickup_lat = ?,
        pickup_lng = ?,
        pickup_address = ?,
        pickup_business_name = ?,
        pickup_landmarks = ?,
        dropoff_lat = ?,
        dropoff_lng = ?,
        dropoff_address = ?,
        dropoff_business_name = ?,
        dropoff_landmarks = ?,
        pickup_contact_name = ?,
        pickup_contact_mobile = ?,
        recipient_name = ?,
        recipient_contact = ?,
        request_type = ?,
        urgency_level = ?,
        on_behalf_of = ?,
        personnel_instructions = ?,
        status = 'submitted_waiting'
      WHERE request_id = ?
    `, [
      delivery_date, 
      time_window, 
      pickup_location.lat,
      pickup_location.lng,
      pickup_location.address,
      pickup_location.businessName || null,
      pickup_location.landmarks || null,
      dropoff_location.lat,
      dropoff_location.lng,
      dropoff_location.address,
      dropoff_location.businessName || null,
      dropoff_location.landmarks || null,
      pickup_contact_name,
      pickup_contact_mobile,
      recipient_name,
      recipient_contact,
      request_type,
      urgency_level,
      on_behalf_of,
      personnel_instructions,
      id
    ]);
    // Log the resubmission
    await pool.query(`
      INSERT INTO status_logs (request_id, status, remark)
      VALUES (?, 'submitted_waiting', 'Request resubmitted with corrections.')
    `, [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('request-updated', { request_id: id, status: 'submitted_waiting' });
    }

    // SCHEDULE ADMIN NOTIFICATION AFTER 60 SECONDS (same as initial creation)
    setTimeout(async () => {
      try {
        // Check if the request still exists and is still in 'submitted_waiting' status
        const [currentStatusRows] = await pool.query('SELECT status, requester_name, requester_department FROM delivery_requests WHERE request_id = ?', [id]) as any[];
        
        if (currentStatusRows && currentStatusRows[0]?.status === 'submitted_waiting') {
          // 1. Update status to 'pending' (now visible to admin as pending review)
          await pool.query('UPDATE delivery_requests SET status = ? WHERE request_id = ?', ['pending', id]);

          const { requester_name, requester_department } = currentStatusRows[0];

          // 2. Get all admin user IDs
          const [admins] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
          
          const notifMessage = `Resubmitted request from ${requester_name} (${requester_department})`;
          const io = req.app.get('io');

          for (const admin of admins) {
            const notifId = `notif_${Date.now()}_resubmit_${Math.random().toString(36).substring(2, 9)}`;
            
            // Insert into DB
            await pool.query(`
              INSERT INTO notifications (id, user_id, message, type, request_id)
              VALUES (?, ?, ?, ?, ?)
            `, [notifId, admin.id, notifMessage, 'request_submitted', id]);

            // Emit Real-time Event
            if (io) {
              io.to(admin.id).emit('notification-added', { 
                id: notifId, 
                message: notifMessage, 
                type: 'request_submitted', 
                request_id: id 
              });
              // Also ensure admin dashboard list updates
              io.to(admin.id).emit('request-updated'); 
            }
          }
          
          // Notify the original requester so their UI updates from 'Queueing' to 'Pending Review'
          const [requesterRow] = await pool.query('SELECT requester_id FROM delivery_requests WHERE request_id = ?', [id]) as any[];
          if (io && requesterRow) {
            io.to(requesterRow.requester_id).emit('request-updated', { request_id: id, status: 'pending' });
          }
        }
      } catch (err) {
        console.error('Error in delayed resubmit notification:', err);
      }
    }, 60000); // 60-second delay

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update delivery status (used by riders)
router.put('/:id/status', validate(updateStatusSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, current_lat, current_lng, timestamp } = req.body;

    // Build the query dynamically depending on whether coordinates are provided
    let query = 'UPDATE delivery_requests SET delivery_status = ?, rider_remark = ?';
    let params: any[] = [status, remark];

    // Handle completed_at timestamp
    if (status === 'completed' || status === 'failed') {
      if (timestamp && !isNaN(new Date(timestamp).getTime())) {
        query += ', completed_at = ?';
        params.push(new Date(timestamp));
      } else {
        query += ', completed_at = CURRENT_TIMESTAMP';
      }
    } else {
      query += ', completed_at = NULL';
    }

    if (current_lat !== undefined && current_lng !== undefined) {
      query += ', current_lat = ?, current_lng = ?';
      params.push(current_lat, current_lng);
    }

    query += ' WHERE request_id = ?';
    params.push(id);

    await pool.query(query, params);

    // Get assigned rider ID for logs
    const [rows] = await pool.query('SELECT assigned_rider_id FROM delivery_requests WHERE request_id = ?', [id]) as any;
    const riderId = (rows && rows.length > 0) ? rows[0].assigned_rider_id : null;

    // Record the status update and remark in status_logs for audit trail
    await pool.query(
      'INSERT INTO status_logs (request_id, rider_id, status, remark, timestamp) VALUES (?, ?, ?, ?, ?)',
      [id, riderId, status, remark || null, timestamp && !isNaN(new Date(timestamp).getTime()) ? new Date(timestamp) : new Date()]
    );

    // If coordinates were provided, also record them in location_logs
    // This acts as a reliable fallback if WebSockets are blocked in production
    if (current_lat !== undefined && current_lng !== undefined && riderId) {
      await pool.query(
        'INSERT INTO location_logs (request_id, rider_id, lat, lng) VALUES (?, ?, ?, ?)',
        [id, riderId, current_lat, current_lng]
      );
    }

    // REAL-TIME: Emit socket event so Admin/Personnel see the update immediately
    const io = req.app.get('io');
    if (io) {
      io.emit('delivery-status-updated', { requestId: id, status, remark });
      
      // If completed or failed, create a notification for the rider
      if ((status === 'completed' || status === 'failed') && riderId) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const message = `Task #${(id as string).slice(-6).toUpperCase()} has been marked as ${status}.`;
        
        await pool.query(`
          INSERT INTO notifications (id, user_id, message, type, request_id)
          VALUES (?, ?, ?, ?, ?)
        `, [notifId, riderId, message, `task_${status}`, id]);

        // Emit to the specific rider
        io.to(riderId).emit('notification-added', { 
          id: notifId, 
          message, 
          type: `task_${status}`, 
          request_id: id 
        });
      }

      // BROADCAST to the specific job room (for Mobile App sync)
      io.to(`job_${id}`).emit('job-status-changed', {
        requestId: id,
        status: status,
        updatedBy: 'system',
        message: `Job status has been updated to ${status.replace('_', ' ')}.`
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get location history logs for a specific request
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT lat, lng, timestamp FROM location_logs WHERE request_id = ? ORDER BY timestamp ASC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get status history logs for a specific request
router.get('/:id/status-history', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT status, remark, timestamp FROM status_logs WHERE request_id = ? ORDER BY timestamp DESC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
