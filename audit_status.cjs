const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rider_scheduling'
  });
  const [rows] = await conn.query("SELECT status, COUNT(*) as count FROM delivery_requests GROUP BY status");
  console.log('Status counts:', rows);
  conn.end();
}
run();
