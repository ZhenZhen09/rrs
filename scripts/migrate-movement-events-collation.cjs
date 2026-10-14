const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

const TARGET_COLLATION = 'utf8mb4_unicode_ci';
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  try {
    const [tables] = await connection.query(
      `SELECT TABLE_COLLATION
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movement_events'`,
    );
    if (tables.length === 0) {
      throw new Error('movement_events table does not exist; run the transparency schema setup first.');
    }

    const [existingColumns] = await connection.query(
      `SELECT COLUMN_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'movement_events'
         AND CHARACTER_SET_NAME IS NOT NULL`,
    );
    const hasColumnMismatch = existingColumns.some(
      (column) => column.COLLATION_NAME !== TARGET_COLLATION,
    );

    if (tables[0].TABLE_COLLATION !== TARGET_COLLATION || hasColumnMismatch) {
      await connection.query(
        `ALTER TABLE movement_events
         CONVERT TO CHARACTER SET utf8mb4 COLLATE ${TARGET_COLLATION}`,
      );
      console.log(`Converted movement_events to ${TARGET_COLLATION}.`);
    } else {
      console.log(`movement_events already uses ${TARGET_COLLATION}.`);
    }

    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'movement_events'
         AND CHARACTER_SET_NAME IS NOT NULL`,
    );
    const mismatched = columns.filter((column) => column.COLLATION_NAME !== TARGET_COLLATION);
    if (mismatched.length > 0) {
      throw new Error(`Collation verification failed: ${JSON.stringify(mismatched)}`);
    }
    console.log(`Verified ${columns.length} movement_events text columns use ${TARGET_COLLATION}.`);

    const [riderIds] = await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND ((TABLE_NAME = 'users' AND COLUMN_NAME = 'id')
           OR (TABLE_NAME = 'delivery_requests' AND COLUMN_NAME = 'assigned_rider_id')
           OR (TABLE_NAME = 'movement_events' AND COLUMN_NAME = 'rider_id')
           OR (TABLE_NAME = 'attendance_logs' AND COLUMN_NAME = 'rider_id'))`,
    );
    const riderIdColumns = new Set(riderIds.map((column) => `${column.TABLE_NAME}.${column.COLUMN_NAME}`));
    const expectedRiderIdColumns = [
      'users.id',
      'delivery_requests.assigned_rider_id',
      'movement_events.rider_id',
      'attendance_logs.rider_id',
    ];
    if (expectedRiderIdColumns.some((column) => !riderIdColumns.has(column))
      || riderIds.some((column) => column.COLLATION_NAME !== TARGET_COLLATION)) {
      throw new Error(`Rider ID columns are not aligned to ${TARGET_COLLATION}: ${JSON.stringify(riderIds)}`);
    }
    console.log(`Verified all four rider ID columns use ${TARGET_COLLATION}.`);

    await connection.query(
      `SELECT u.id
       FROM users u
       LEFT JOIN delivery_requests dr ON dr.assigned_rider_id = u.id
       LEFT JOIN movement_events me ON me.rider_id = u.id
       LEFT JOIN attendance_logs al ON al.rider_id = u.id
       WHERE u.role = 'rider'
       LIMIT 1`,
    );
    console.log('Verified rider attendance ID comparisons execute successfully.');
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Movement-event collation migration failed:', error.message);
  process.exitCode = 1;
});
