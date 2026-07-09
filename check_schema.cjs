const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const [rows] = await db.query('DESCRIBE delivery_requests');
  const dsCol = rows.find(r => r.Field === 'delivery_status');
  console.log('delivery_status Schema:', dsCol);
  await db.end();
}
run().catch(console.error);
