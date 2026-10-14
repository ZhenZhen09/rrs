import { pool } from './db';

async function run() {
  try {
    // Get john.hr user ID
    const [hrRows]: any = await pool.query('SELECT id FROM users WHERE email LIKE "%john.hr%" OR email LIKE "%john%" LIMIT 1');
    const hrId = hrRows[0]?.id;

    if (!hrId) {
      console.log("Could not find john.hr user");
      process.exit(1);
    }

    // Get a rider user ID
    const [riderRows]: any = await pool.query('SELECT id, email FROM users WHERE role = "rider" LIMIT 1');
    const riderId = riderRows[0]?.id;
    const riderEmail = riderRows[0]?.email;

    if (!riderId) {
      console.log("Could not find a rider user");
      process.exit(1);
    }

    const reqId = 'TEST_OVERDUE_' + Date.now();
    
    // create an overdue task (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const query = `
      INSERT INTO delivery_requests (
        request_id,
        requester_id,
        requester_name,
        request_type,
        recipient_name,
        urgency_level,
        delivery_date,
        time_window,
        pickup_address,
        pickup_lat,
        pickup_lng,
        dropoff_address,
        dropoff_lat,
        dropoff_lng,
        status,
        delivery_status,
        assigned_rider_id
      ) VALUES (
        ?, ?, 'John HR', 'Delivery', 'Test Recipient', 'Normal', ?, '10:00 - 11:00',
        'HR Office', 0, 0, 'Test Location', 0, 0, 'approved', 'assigned', ?
      )
    `;

    await pool.query(query, [reqId, hrId, yesterdayStr, riderId]);
    
    console.log('Overdue task created successfully!');
    console.log('Task ID:', reqId);
    console.log('Assigned to Rider:', riderEmail);
    
    process.exit(0);
  } catch (err) {
    console.error("Error creating task:", err);
    process.exit(1);
  }
}

run();
