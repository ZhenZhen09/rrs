const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'server/.env' });

async function rescueTransaction() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🚑 Rescuing failed Credit Collection transaction...');

  const sql = `
    INSERT INTO delivery_requests (
      request_id, requester_id, requester_name, requester_department,
      delivery_date, time_window, 
      pickup_lat, pickup_lng, pickup_address, pickup_business_name, pickup_landmarks,
      dropoff_lat, dropoff_lng, dropoff_address, dropoff_business_name, dropoff_landmarks, 
      pickup_contact_name, pickup_contact_mobile,
      recipient_name, recipient_contact,
      request_type, urgency_level, personnel_instructions, on_behalf_of, admin_remark,
      status, delivery_status
    ) VALUES (
      'req_1779768199574', 'personnel_e6961f53', 'Ricapuerto, Angel Vie', 'Finance', 
      '2026-05-28', '11:00 - 11:30', 
      14.534881020928863, 121.02134585380556, '2294 Chino Roces Avenue Extension, Makati, 1231 Metro Manila, Philippines', 'Alegria Alta', NULL, 
      14.571559419044368, 121.01553082466127, '347 J. P. Rizal Street, Manila, 1206 National Capital District, Philippines', 'Dasma', NULL, 
      'Angel', NULL, 'Dr Belo', '', 
      'Credit Collection', 'Medium', NULL, NULL, NULL, 
      'submitted_waiting', 'pending'
    )
  `;

  try {
    await pool.query(sql);
    console.log('✅ Success! The transaction has been restored and is now visible in the Admin Dashboard.');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️ Notice: This transaction was already rescued or exists.');
    } else {
      console.error('❌ Failed to rescue:', err.message);
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

rescueTransaction();
