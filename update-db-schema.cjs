const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function updateSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  try {
    console.log('Adding exceptions and exception_severity columns...');
    // Add columns if they don't exist
    await pool.query(`
      ALTER TABLE delivery_requests 
      ADD COLUMN IF NOT EXISTS exceptions JSON DEFAULT NULL, 
      ADD COLUMN IF NOT EXISTS exception_severity ENUM('warning', 'critical') DEFAULT NULL;
    `);
    console.log('✅ Database schema updated successfully');
  } catch (err) {
    console.error('❌ Failed to update schema:', err.message);
  } finally {
    await pool.end();
  }
}

updateSchema();
