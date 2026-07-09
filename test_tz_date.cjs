const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    dateStrings: true // use what the app uses!
  });

  const [rows] = await db.query("SELECT '2026-07-02 12:00:00' as str, CONVERT_TZ('2026-07-02 12:00:00', '+00:00', '+08:00') as res1, UTC_TIMESTAMP() as res2, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00') as res3");
  console.log('TZ Test (dateStrings):', rows);
  await db.end();
}
run().catch(console.error);
