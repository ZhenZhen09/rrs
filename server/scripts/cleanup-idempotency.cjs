const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function cleanup() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  console.log('🧹 Running Idempotency Key Cleanup...');

  try {
    const [result] = await pool.query('DELETE FROM idempotency_keys WHERE expires_at < NOW()');
    console.log(`   ✅ Deleted ${(result as any).affectedRows} expired keys.`);
  } catch (err) {
    console.error('   ❌ Cleanup failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

cleanup();
