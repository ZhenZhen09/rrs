const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const requests = [
      {
        id: `REQ-TEST-${Date.now()}-1`,
        desc: 'Contract Signature Retrieval'
      },
      {
        id: `REQ-TEST-${Date.now()}-2`,
        desc: 'Marketing Collateral Delivery'
      },
      {
        id: `REQ-TEST-${Date.now()}-3`,
        desc: 'General Office Supplies Pickup'
      }
    ];

    for (const req of requests) {
      await pool.query(
        `INSERT INTO delivery_requests (
          request_id, requester_id, requester_name, requester_department,
          delivery_date, time_window, pickup_address, dropoff_address,
          recipient_name, recipient_contact, request_type, urgency_level,
          personnel_instructions, status, delivery_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.id,
          'personnel_001',
          'John Smith',
          'Human Resources',
          today,
          '09:00 - 17:00',
          'Company HQ, Floor 4',
          'Client Office A',
          'Jane Client',
          '09123456789',
          'Delivery/Pickup',
          'Medium',
          req.desc,
          'pending',
          'pending'
        ]
      );
      console.log(`✅ Created request: ${req.id} - ${req.desc}`);
    }
  } catch (err) {
    console.error('Error inserting data:', err);
  } finally {
    process.exit(0);
  }
}

run();
