const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  console.log('🚀 Starting Phase 3 Migration: Governance & Infrastructure...');

  try {
    console.log('\n🔹 Creating: system_audit_logs table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        actor_id VARCHAR(50) NOT NULL,
        actor_role VARCHAR(20) NOT NULL,
        action VARCHAR(100) NOT NULL, -- e.g., 'approve_request', 'update_status', 'delete_user'
        resource_type VARCHAR(50) NOT NULL, -- e.g., 'delivery_requests', 'users'
        resource_id VARCHAR(50) NOT NULL,
        old_values JSON NULL,
        new_values JSON NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        INDEX (actor_id),
        INDEX (resource_id),
        INDEX (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅ Audit table created.');

    console.log('\n🔹 Creating: archive_delivery_requests table');
    // Mirror the schema of delivery_requests but for archival
    await pool.query(`
      CREATE TABLE IF NOT EXISTS archive_delivery_requests LIKE delivery_requests;
    `);
    console.log('   ✅ Archive table mirrored.');

    console.log('\n⭐ Phase 3 Backend Schema Hardening Complete!');
  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

runMigration();
