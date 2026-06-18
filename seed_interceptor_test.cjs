const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const today = new Date().toISOString().slice(0, 10);
  console.log('Seeding test data for today:', today);

  const riderId = 'rider_001';
  const riderName = 'Mike Rider';

  // Ensure rider exists in users table
  await db.execute(
    'INSERT INTO users (id, email, name, role, password_hash, status, is_on_duty, is_online) ' +
    'VALUES (?, ?, ?, "rider", "hash", "active", 1, 1) ' +
    'ON DUPLICATE KEY UPDATE name=VALUES(name), is_on_duty=1, is_online=1',
    [riderId, 'rider1@company.com', riderName]
  );

  // Ensure there is a 'present' attendance log for today
  await db.execute(
    'INSERT INTO attendance_logs (id, rider_id, date, status, check_in_time) ' +
    'VALUES (?, ?, ?, "present", NOW()) ' +
    'ON DUPLICATE KEY UPDATE status="present", check_in_time=NOW()',
    ['att_' + riderId + '_' + today, riderId, today]
  );

  // 2. Create 3 Active tasks for the rider
  const activeTasks = [
    ['req_active_1', 'personnel_001', 'John HR', 'Human Resources', today, '08:00 - 09:00', 14.5995, 120.9842, 'Pickup A', 14.6000, 120.9850, 'approved', riderId, riderName, 'assigned', 1],
    ['req_active_2', 'personnel_001', 'John HR', 'Human Resources', today, '09:00 - 10:00', 14.5995, 120.9842, 'Pickup B', 14.6005, 120.9855, 'approved', riderId, riderName, 'in_progress', 2],
    ['req_active_3', 'personnel_001', 'John HR', 'Human Resources', today, '10:00 - 11:00', 14.5995, 120.9842, 'Pickup C', 14.6010, 120.9860, 'approved', riderId, riderName, 'assigned', 3],
  ];

  for (const task of activeTasks) {
    await db.execute(
      'INSERT INTO delivery_requests ' +
      '(request_id, requester_id, requester_name, requester_department, delivery_date, time_window, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, status, assigned_rider_id, assigned_rider_name, delivery_status, queue_order, dropoff_address, recipient_name, recipient_contact) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Dropoff", "Recipient", "09170000000") ' +
      'ON DUPLICATE KEY UPDATE delivery_date=VALUES(delivery_date), status=VALUES(status), delivery_status=VALUES(delivery_status), queue_order=VALUES(queue_order)',
      task
    );
  }

  // 3. Create 1 Pending task
  const pendingTask = ['req_pending_1', 'personnel_001', 'John HR', 'Human Resources', today, '11:00 - 12:00', 14.5995, 120.9842, 14.6015, 120.9865, 'Pickup New', 'pending', 'Delivery/Pickup', 'High'];
  
  await db.execute(
    'INSERT INTO delivery_requests ' +
    '(request_id, requester_id, requester_name, requester_department, delivery_date, time_window, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, status, request_type, urgency_level, dropoff_address, recipient_name, recipient_contact) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Dropoff New", "Recipient New", "09170000001") ' +
    'ON DUPLICATE KEY UPDATE delivery_date=VALUES(delivery_date), status=VALUES(status)',
    pendingTask
  );

  console.log('Test data seeded successfully.');
  await db.end();
}

run().catch(console.error);
