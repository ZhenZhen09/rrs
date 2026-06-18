const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), 'server', '.env');
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
    console.log('🚀 Phase 1: Creating attendance_logs table in:', process.env.DB_NAME);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id VARCHAR(50) PRIMARY KEY,
        rider_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        status ENUM('present', 'absent', 'on_leave') NOT NULL,
        reason VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_rider_date (rider_id, date),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ attendance_logs table created successfully.');
    console.log('⭐ Phase 1 Migration Complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
