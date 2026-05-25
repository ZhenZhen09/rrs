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

  console.log('🚀 Starting Phase 1 Migration: Idempotency Table...');

  try {
    console.log('\n🔹 Creating: idempotency_keys table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        idempotency_key VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        response_code INT NOT NULL,
        response_body JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        INDEX (expires_at),
        INDEX (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅ Success.');

    console.log('\n⭐ Phase 1 Backend Schema Hardening Complete!');
  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

runMigration();
