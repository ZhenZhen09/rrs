const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [rows] = await connection.execute('SELECT email, role FROM users WHERE role = "personnel" LIMIT 1');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

check().catch(console.error);
