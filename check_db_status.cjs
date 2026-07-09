const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const [rows] = await db.query('SELECT request_id, status, delivery_status FROM delivery_requests WHERE request_id LIKE "%169414%"');
  console.log('Database Record:', rows[0]);
  await db.end();
}
run().catch(console.error);
