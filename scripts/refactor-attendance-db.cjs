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
    console.log('🚀 Phase 1: Adding off_duty_time to attendance_logs...');
    
    const result = await pool.query('SHOW COLUMNS FROM attendance_logs');
    const columns = result[0];
    const columnNames = columns.map((c) => c.Field);

    if (!columnNames.includes('off_duty_time')) {
      console.log('Adding off_duty_time column...');
      await pool.query('ALTER TABLE attendance_logs ADD COLUMN off_duty_time DATETIME DEFAULT NULL');
    }
    
    console.log('✅ attendance_logs schema updated.');
    console.log('⭐ Phase 1 Complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
