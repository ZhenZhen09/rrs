const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const [rows] = await db.query('DESCRIBE attendance_logs');
  console.log('attendance_logs Schema:', rows);
  await db.end();
}
run().catch(console.error);
