const mysql = require('mysql2/promise');
require('dotenv').config({path: './server/.env'});

async function syncTest() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const testDate = '2026-03-30';
  const testSlot = '08:00 - 08:30';
  const testId = 'sync_test_' + Date.now();

  console.log('--- SYNC TEST START ---');
  
  // 1. Get initial availability
  const response1 = await fetch(`http://localhost:3001/api/requests/availability?date=${testDate}`);
  const data1 = await response1.json();
  const initialCount = data1.find(i => i.time_window === testSlot)?.count || 0;
  console.log('Initial Occupancy:', initialCount);

  // 2. Simulate Admin Action (Insert Approved Request)
  console.log('Simulating Admin Approval...');
  await connection.execute(`
    INSERT INTO delivery_requests (
      request_id, requester_id, requester_name, delivery_date, time_window, 
      pickup_address, dropoff_address, recipient_name, recipient_contact, 
      status, delivery_status
    ) VALUES (?, 'personnel_001', 'Sync Test', ?, ?, 'Address A', 'Address B', 'Recip', '123', 'approved', 'assigned')
  `, [testId, testDate, testSlot]);

  // 3. Verify Availability updated
  const response2 = await fetch(`http://localhost:3001/api/requests/availability?date=${testDate}`);
  const data2 = await response2.json();
  const newCount = data2.find(i => i.time_window === testSlot)?.count || 0;
  console.log('New Occupancy:', newCount);

  if (newCount === initialCount + 1) {
    console.log('✅ SYNC SUCCESS: Backend reflects changes instantly.');
  } else {
    console.log('❌ SYNC FAILED: Count mismatch.');
  }

  // Cleanup
  await connection.execute('DELETE FROM delivery_requests WHERE request_id = ?', [testId]);
  await connection.end();
}

syncTest().catch(console.error);
