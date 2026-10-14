const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const APPLY = process.argv.includes('--apply');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'defaultdb_test',
    waitForConnections: true,
    connectionLimit: 2,
    dateStrings: true,
    timezone: '+08:00',
  });

  try {
    const [candidates] = await pool.query(`
      SELECT id, event_time, created_at, location_recorded_at
      FROM rider_connectivity_logs
      WHERE TIMESTAMPDIFF(MINUTE, event_time, created_at) BETWEEN 475 AND 485
      ORDER BY created_at ASC
    `);

    console.log(`${APPLY ? 'Repairing' : 'Candidate'} rows: ${candidates.length}`);
    if (!candidates.length) return;
    console.log(candidates.slice(0, 10));

    if (!APPLY) {
      console.log('Dry run only. Re-run with --apply to shift only these approximately 8-hour-old event timestamps.');
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`
        UPDATE rider_connectivity_logs
        SET event_time = DATE_ADD(event_time, INTERVAL 8 HOUR),
            location_recorded_at = CASE
              WHEN location_recorded_at IS NOT NULL
               AND TIMESTAMPDIFF(MINUTE, location_recorded_at, created_at) BETWEEN 475 AND 485
              THEN DATE_ADD(location_recorded_at, INTERVAL 8 HOUR)
              ELSE location_recorded_at
            END
        WHERE TIMESTAMPDIFF(MINUTE, event_time, created_at) BETWEEN 475 AND 485
      `);
      await connection.commit();
      console.log(`Repaired ${candidates.length} connectivity rows.`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('No rider_connectivity_logs table found; nothing to repair.');
      return;
    }
    throw error;
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`Timezone repair failed: ${error.message}`);
  process.exitCode = 1;
});
