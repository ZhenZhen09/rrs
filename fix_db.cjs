const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  const [result] = await db.query("UPDATE delivery_requests SET delivery_status = 'pending' WHERE delivery_status = '' AND status = 'pending'");
  console.log('Fixed records:', result.affectedRows);
  await db.end();
}
run().catch(console.error);
