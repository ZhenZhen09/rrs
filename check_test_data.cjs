const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [riders] = await db.execute('SELECT id, name, is_on_duty, is_online FROM users WHERE role = "rider"');
  console.log('Riders:', riders);

  const [attendance] = await db.execute('SELECT * FROM attendance_logs WHERE date = CURDATE()');
  console.log('Today Attendance:', attendance);

  await db.end();
}

run().catch(console.error);
