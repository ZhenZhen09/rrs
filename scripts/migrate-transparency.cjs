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
    console.log('🚀 Phase 1: Checking users table columns...');
    const result = await pool.query('SHOW COLUMNS FROM users');
    const columns = result[0];
    const columnNames = columns.map((c) => c.Field);

    if (!columnNames.includes('is_on_duty')) {
      console.log('Adding is_on_duty...');
      await pool.query("ALTER TABLE users ADD COLUMN is_on_duty BOOLEAN DEFAULT FALSE");
    }
    if (!columnNames.includes('last_battery_level')) {
      console.log('Adding last_battery_level...');
      await pool.query("ALTER TABLE users ADD COLUMN last_battery_level TINYINT DEFAULT NULL");
    }
    if (!columnNames.includes('last_signal_strength')) {
      console.log('Adding last_signal_strength...');
      await pool.query("ALTER TABLE users ADD COLUMN last_signal_strength VARCHAR(20) DEFAULT NULL");
    }
    console.log('✅ Users table columns verified/added.');

    console.log('🚀 Phase 1: Creating movement_events table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movement_events (
        id VARCHAR(50) PRIMARY KEY,
        request_id VARCHAR(50),
        rider_id VARCHAR(50),
        event_type ENUM('duty_on', 'duty_off', 'arrived_pickup', 'left_pickup', 'arrived_dropoff', 'idle_alert', 'signal_lost') NOT NULL,
        message VARCHAR(255),
        metadata JSON,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_request (request_id),
        INDEX idx_rider (rider_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ movement_events table created.');

    console.log('⭐ Database update complete!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
