const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const [rows] = await db.query('SELECT * FROM attendance_logs ORDER BY created_at DESC LIMIT 5');
  console.log('Sample rows:', rows);
  await db.end();
}
run().catch(console.error);
