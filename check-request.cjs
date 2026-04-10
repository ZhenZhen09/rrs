const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute('SELECT * FROM delivery_requests WHERE request_id = ?', ['req_1775789068253']);
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

check().catch(console.error);
