const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  try {
    console.log('🚀 Adding pending_review to delivery_status ENUM...');
    
    // Exact list from schema.json + 'pending_review'
    const newEnum = "ENUM('pending','assigned','picked_up','in_transit','in_progress','delivered','completed','failed','pending_review')";
    
    await pool.query(`ALTER TABLE delivery_requests MODIFY COLUMN delivery_status ${newEnum} DEFAULT 'pending'`);
    
    console.log('✅ Success!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
