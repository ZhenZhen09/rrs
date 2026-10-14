const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

function buildLegacyShiftSessionRows(rows, today = getPhilippineDateString()) {
  return rows
    .filter((row) => row.status === 'present' && row.check_in_time)
    .map((row) => ({
      id: `legacy_${row.id}`,
      rider_id: row.rider_id,
      source_attendance_id: row.id,
      start_time: row.check_in_time,
      end_time: row.off_duty_time || null,
      session_state: row.off_duty_time ? 'closed' : row.date === today && Boolean(row.is_on_duty) ? 'open' : 'legacy_unknown',
    }));
}

function getPhilippineDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function migrate(pool, { dryRun = false, logger = console } = {}) {
  const [legacyRows] = await pool.query(
    `SELECT al.id, al.rider_id, DATE_FORMAT(al.date, '%Y-%m-%d') AS date, al.check_in_time, al.off_duty_time, u.is_on_duty
     FROM attendance_logs al LEFT JOIN users u ON u.id = al.rider_id
     WHERE al.check_in_time IS NOT NULL AND al.status = 'present' ORDER BY al.id`
  );
  const proposed = buildLegacyShiftSessionRows(legacyRows, getPhilippineDateString());
  const [tableRows] = await pool.query(
    "SELECT COUNT(*) AS table_exists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'shift_sessions'"
  );
  const tableExists = Number(tableRows[0]?.table_exists || 0) > 0;
  const [receiptTableRows] = await pool.query(
    "SELECT COUNT(*) AS table_exists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'shift_operation_receipts'"
  );
  const receiptTableExists = Number(receiptTableRows[0]?.table_exists || 0) > 0;
  let existingSources = new Set();
  if (tableExists) {
    const [sourceRows] = await pool.query('SELECT source_attendance_id FROM shift_sessions WHERE source_attendance_id IS NOT NULL');
    existingSources = new Set(sourceRows.map((row) => row.source_attendance_id));
  }
  const alreadyBackfilled = proposed.filter((row) => existingSources.has(row.source_attendance_id)).length;
  const missing = proposed.length - alreadyBackfilled;
  const classifications = proposed.reduce((counts, row) => ({ ...counts, [row.session_state]: counts[row.session_state] + 1 }), { open: 0, closed: 0, legacy_unknown: 0 });
  if (dryRun) {
    logger.log(`Dry run: shift_sessions table ${tableExists ? 'exists' : 'is missing'}; shift_operation_receipts table ${receiptTableExists ? 'exists' : 'is missing'}; ${proposed.length} proposed (${classifications.open} open, ${classifications.closed} closed, ${classifications.legacy_unknown} end unknown); ${alreadyBackfilled} already backfilled; ${missing} would be inserted.`);
    return { tableExists, receiptTableExists, proposed: proposed.length, alreadyBackfilled, wouldInsert: missing, ...classifications, dryRun: true };
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS shift_sessions (
    id VARCHAR(80) PRIMARY KEY,
    rider_id VARCHAR(50) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    session_state ENUM('open','closed','legacy_unknown') NOT NULL DEFAULT 'open',
    start_operation_id VARCHAR(100) NULL,
    end_operation_id VARCHAR(100) NULL,
    handover_reason VARCHAR(500) NULL,
    active_task_count_at_end INT NULL,
    source_attendance_id VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shift_legacy_attendance (source_attendance_id),
    UNIQUE KEY uq_shift_start_operation (rider_id, start_operation_id),
    UNIQUE KEY uq_shift_end_operation (rider_id, end_operation_id),
    KEY idx_shift_rider_start (rider_id, start_time),
    KEY idx_shift_rider_end (rider_id, end_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [stateColumns] = await pool.query("SHOW COLUMNS FROM shift_sessions LIKE 'session_state'");
  if (!stateColumns.length) {
    await pool.query("ALTER TABLE shift_sessions ADD COLUMN session_state ENUM('open','closed','legacy_unknown') NULL AFTER end_time");
  }
  await pool.query(`UPDATE shift_sessions ss
    LEFT JOIN users u ON u.id = ss.rider_id
    SET ss.session_state = CASE
      WHEN ss.end_time IS NOT NULL THEN 'closed'
      WHEN ss.source_attendance_id IS NOT NULL AND DATE(ss.start_time) = ${"DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00'))"} AND COALESCE(u.is_on_duty, 0) = 1 THEN 'open'
      WHEN ss.source_attendance_id IS NOT NULL THEN 'legacy_unknown'
      ELSE 'open'
    END
    WHERE ss.session_state IS NULL`);
  await pool.query("ALTER TABLE shift_sessions MODIFY session_state ENUM('open','closed','legacy_unknown') NOT NULL DEFAULT 'open'");

  await pool.query(`CREATE TABLE IF NOT EXISTS shift_operation_receipts (
    id VARCHAR(80) PRIMARY KEY,
    rider_id VARCHAR(50) NOT NULL,
    operation_id VARCHAR(100) NOT NULL,
    operation_kind ENUM('start','end') NOT NULL,
    session_id VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shift_operation (rider_id, operation_id),
    KEY idx_shift_operation_session (session_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const values = proposed.map((row) => [row.id, row.rider_id, row.start_time, row.end_time, row.session_state, row.source_attendance_id]);
  let inserted = 0;
  if (values.length) {
    const [result] = await pool.query(
      'INSERT IGNORE INTO shift_sessions (id, rider_id, start_time, end_time, session_state, source_attendance_id) VALUES ?',
      [values]
    );
    inserted = Number(result.affectedRows || 0);
  }
  logger.log(`Shift session migration complete: ${proposed.length} legacy rows considered (${classifications.open} open, ${classifications.closed} closed, ${classifications.legacy_unknown} end unknown); ${inserted} inserted; ${alreadyBackfilled} already present.`);
  return { proposed: proposed.length, inserted, alreadyBackfilled, ...classifications, dryRun: false };
}

async function run() {
  const envPath = path.join(process.cwd(), 'server', '.env');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    timezone: '+08:00',
    dateStrings: true,
  });
  try {
    await migrate(pool, { dryRun: process.argv.includes('--dry-run') });
  } catch (error) {
    console.error('Shift session migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) run();
module.exports = { buildLegacyShiftSessionRows, migrate };
