const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

async function migrate(db) {
  const [columns] = await db.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_id'",
  );
  if (columns.length === 0) {
    await db.query('ALTER TABLE users ADD COLUMN avatar_id VARCHAR(32) NULL');
  }
}

async function main() {
  dotenv.config({ path: path.join(__dirname, '../server/.env') });
  dotenv.config();
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    timezone: '+08:00',
    connectionLimit: 2,
  });
  try {
    await migrate(db);
    console.log('Rider avatar column is ready.');
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Rider avatar migration failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { migrate };
