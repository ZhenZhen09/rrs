const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const today = new Date().toISOString().slice(0, 10);
  console.log('Seeding revision data for today:', today);

  const reqId = 'req_revision_' + Date.now().toString().slice(-6);

  await db.execute(
    'INSERT INTO delivery_requests ' +
    '(request_id, requester_id, requester_name, requester_department, delivery_date, time_window, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, status, request_type, urgency_level, recipient_name, recipient_contact, admin_remark) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ',
    [
      reqId,
      'personnel_001',
      'John HR',
      'Human Resources',
      today,
      '09:00 - 10:00',
      14.5995, 120.9842,
      'HR Office',
      14.6015, 120.9865,
      'Finance Dept',
      'returned_for_revision',
      'Delivery/Pickup',
      'High',
      'Jane Finance',
      '09171234567',
      'Please update the exact pickup location.'
    ]
  );

  console.log('Revision test data seeded successfully. Request ID:', reqId);
  await db.end();
}

run().catch(console.error);
