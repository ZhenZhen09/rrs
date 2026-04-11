const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function updateSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('Adding completed_at column to delivery_requests...');
    await pool.query(`
      ALTER TABLE delivery_requests 
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL;
    `);
    
    console.log('Backfilling completed_at from status_logs...');
    // This query finds the latest 'completed' or 'failed' timestamp for each request
    await pool.query(`
      UPDATE delivery_requests r
      JOIN (
        SELECT request_id, MAX(timestamp) as last_ts
        FROM status_logs
        WHERE status IN ('completed', 'failed')
        GROUP BY request_id
      ) l ON r.request_id = l.request_id
      SET r.completed_at = l.last_ts
      WHERE r.delivery_status IN ('completed', 'failed') AND r.completed_at IS NULL;
    `);

    console.log('✅ Database schema updated and backfilled successfully');
  } catch (err) {
    console.error('❌ Failed to update schema:', err.message);
  } finally {
    await pool.end();
  }
}

updateSchema();
