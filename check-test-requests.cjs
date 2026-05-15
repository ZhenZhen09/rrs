const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [rows] = await conn.execute('SELECT request_id, status, created_at, recipient_name FROM delivery_requests WHERE recipient_name LIKE "QA-User%" ORDER BY created_at DESC LIMIT 5');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}
run().catch(console.error);
