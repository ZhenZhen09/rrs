const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const today = new Date().toISOString().slice(0, 10);

  await connection.execute(`
    INSERT INTO delivery_requests (
      request_id, requester_id, requester_name, requester_department,
      delivery_date, time_window, 
      pickup_lat, pickup_lng, pickup_address, 
      dropoff_lat, dropoff_lng, dropoff_address,
      recipient_name, recipient_contact, status, assigned_rider_id, assigned_rider_name, delivery_status
    ) VALUES (
      'test_geo_002', 'personnel_001', 'John Smith', 'Human Resources',
      ?, '09:00 - 10:00', 
      14.1625, 121.2619, 'CARD MRI Development Institute',
      14.0717, 121.3250, 'CARD MRI Information Technology Inc. (CMIT)',
      'Maria Santos', '+639123456789',
      'approved', 'rider_001', 'Mike Rider', 'in_progress'
    ) ON DUPLICATE KEY UPDATE 
      delivery_date = ?, 
      pickup_lat = 14.1625, pickup_lng = 121.2619, pickup_address = 'CARD MRI Development Institute',
      dropoff_lat = 14.0717, dropoff_lng = 121.3250, dropoff_address = 'CARD MRI Information Technology Inc. (CMIT)',
      status = 'approved', delivery_status = 'in_progress', assigned_rider_id = 'rider_001';
  `, [today, today]);

  console.log('Inserted test request');
  process.exit(0);
}
main().catch(console.error);