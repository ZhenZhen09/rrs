const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    // Use single quotes for string literal
    const [rows] = await connection.execute("SELECT email, role FROM users WHERE role = 'personnel' LIMIT 1");
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (err) {
    console.error('Database Error:', err.message);
    process.exit(1);
  }
}

check().catch(console.error);
