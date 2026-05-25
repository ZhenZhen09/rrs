const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function archiveOldRequests() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  const DAYS_TO_KEEP = 90;
  console.log(`📦 [ARCHIVAL] Starting archival process (Older than ${DAYS_TO_KEEP} days)...`);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Identify requests to archive (terminal status and older than 90 days)
    const [toArchive] = await connection.query(`
      SELECT request_id FROM delivery_requests 
      WHERE (status IN ('completed', 'delivered', 'failed', 'cancelled', 'disapproved')
         OR delivery_status IN ('completed', 'delivered', 'failed', 'cancelled'))
      AND updated_at < (NOW() - INTERVAL ? DAY)
    `, [DAYS_TO_KEEP]);

    const requestIds = (toArchive as any[]).map(r => r.request_id);

    if (requestIds.length === 0) {
      console.log('   ✅ No old requests to archive.');
      await connection.rollback();
      return;
    }

    console.log(`   🔹 Archiving ${requestIds.length} requests...`);

    // 2. Move to archive table
    for (const id of requestIds) {
      await connection.query(`
        INSERT INTO archive_delivery_requests 
        SELECT * FROM delivery_requests WHERE request_id = ?
      `, [id]);
    }

    // 3. Delete from operational table
    await connection.query(`
      DELETE FROM delivery_requests 
      WHERE request_id IN (?)
    `, [requestIds]);

    await connection.commit();
    console.log(`   ✅ Successfully archived ${requestIds.length} records.`);

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('   ❌ Archival failed:', err.message);
  } finally {
    if (connection) connection.release();
    await pool.end();
    process.exit();
  }
}

archiveOldRequests();
