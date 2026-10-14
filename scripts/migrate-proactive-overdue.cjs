const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), 'server/.env') });
dotenv.config();

const columns = [
  ['scheduled_end_at', 'DATETIME NULL'],
  ['overdue_at', 'DATETIME NULL'],
  ['failed_at', 'DATETIME NULL'],
  ['failure_reason_code', 'VARCHAR(64) NULL'],
  ['at_risk_notified_at', 'DATETIME NULL'],
  ['overdue_notified_at', 'DATETIME NULL'],
];

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    timezone: '+08:00',
    connectionLimit: 2,
  });

  try {
    for (const [name, definition] of columns) {
      const [found] = await pool.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery_requests' AND COLUMN_NAME = ?`,
        [name],
      );
      if (found.length === 0) {
        await pool.query(`ALTER TABLE delivery_requests ADD COLUMN \`${name}\` ${definition}`);
        console.log(`Added delivery_requests.${name}`);
      }
    }

    // The existing time_window format is "HH:mm - HH:mm". Leave malformed legacy rows null.
    await pool.query(`
      UPDATE delivery_requests
      SET scheduled_end_at = STR_TO_DATE(
        CONCAT(DATE_FORMAT(delivery_date, '%Y-%m-%d'), ' ', TRIM(SUBSTRING_INDEX(time_window, '-', -1))),
        '%Y-%m-%d %H:%i'
      )
      WHERE scheduled_end_at IS NULL
        AND delivery_date IS NOT NULL
        AND time_window REGEXP '[0-9]{1,2}:[0-9]{2} *$'
    `);
    await pool.query(`UPDATE delivery_requests SET failed_at = completed_at WHERE failed_at IS NULL AND delivery_status = 'failed' AND completed_at IS NOT NULL`);
    console.log('Proactive overdue migration complete.');
  } catch (error) {
    console.error('Proactive overdue migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
