const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rider_scheduling'
  });
  const [rows] = await conn.query("SELECT request_id, created_at, status, delivery_status FROM delivery_requests WHERE created_at LIKE '2026-07%'");
  console.log('July requests:', rows);
  conn.end();
}
run();
