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
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'defaultdb_test',
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const dbName = process.env.DB_NAME || 'defaultdb_test';
    console.log(`Creating rider_connectivity_logs in ${dbName}...`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rider_connectivity_logs (
        id VARCHAR(64) PRIMARY KEY,
        rider_id VARCHAR(64) NOT NULL,
        rider_name VARCHAR(255) NULL,
        request_id VARCHAR(64) NULL,
        event_type ENUM(
          'duty_on',
          'duty_off',
          'offline_in_progress',
          'online_restored',
          'delayed_location'
        ) NOT NULL,
        event_time DATETIME NOT NULL,
        delivery_status VARCHAR(64) NULL,
        is_on_duty BOOLEAN NULL,
        lat DECIMAL(10, 8) NULL,
        lng DECIMAL(11, 8) NULL,
        location_recorded_at DATETIME NULL,
        location_age_seconds INT NULL,
        battery_level INT NULL,
        network_type VARCHAR(64) NULL,
        duration_seconds INT NULL,
        likely_reason VARCHAR(64) NULL,
        risk_level ENUM('low', 'medium', 'high', 'critical', 'unknown') DEFAULT 'unknown',
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_rcl_event_time (event_time),
        INDEX idx_rcl_rider_time (rider_id, event_time),
        INDEX idx_rcl_request_time (request_id, event_time),
        INDEX idx_rcl_event_type (event_type),
        INDEX idx_rcl_risk_level (risk_level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log(`rider_connectivity_logs is ready in ${dbName}.`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
