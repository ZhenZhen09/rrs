const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

async function migrate(pool, { dryRun = false, logger = console } = {}) {
  const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'fcm_token'");
  if (columns.length) {
    logger.log('Rider FCM token migration: fcm_token column already exists.');
    return { changed: false, dryRun };
  }

  if (dryRun) {
    logger.log('Dry run: users.fcm_token TEXT NULL would be added.');
    return { changed: true, dryRun: true };
  }

  await pool.query('ALTER TABLE users ADD COLUMN fcm_token TEXT NULL');
  logger.log('Rider FCM token migration complete: users.fcm_token added.');
  return { changed: true, dryRun: false };
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
    console.error('Rider FCM token migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) run();
module.exports = { migrate };
