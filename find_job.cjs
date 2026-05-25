const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dateStrings: true,
    timezone: '+08:00'
  });
  
  const [rows] = await conn.execute('SELECT * FROM delivery_requests WHERE request_id LIKE "%583097%"');
  console.log('Type of delivery_date:', typeof rows[0].delivery_date);
  console.log('Raw delivery_date:', rows[0].delivery_date);
  console.log(JSON.stringify(rows, null, 2));
  
  await conn.end();
}
run().catch(console.error);
