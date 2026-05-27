const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'server/.env' });

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🚀 Adding approved_at column to delivery_requests...');

  try {
    // 1. Add the column
    await pool.query('ALTER TABLE delivery_requests ADD COLUMN approved_at TIMESTAMP NULL AFTER updated_at');
    
    // 2. Backfill existing approved requests with their current updated_at as a starting point
    await pool.query('UPDATE delivery_requests SET approved_at = updated_at WHERE status = "approved"');
    
    console.log('✅ Success! Database hardened with stable approved_at column.');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN') {
      console.log('ℹ️ Column already exists, skipping.');
    } else {
      console.error('❌ Migration failed:', err.message);
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

migrate();
