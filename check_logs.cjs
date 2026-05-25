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
  
  const [rows] = await conn.execute('SELECT * FROM status_logs WHERE request_id = ? ORDER BY timestamp DESC', ['req_1779367583097']);
  console.log(JSON.stringify(rows, null, 2));
  
  await conn.end();
}
run().catch(console.error);
