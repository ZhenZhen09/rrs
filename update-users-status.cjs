const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  try {
    await connection.execute(`
      ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
    `);
    console.log('Added status column to users table');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column status already exists');
    } else {
      console.error('Error adding status column:', e.message);
    }
  }

  process.exit(0);
}

main().catch(console.error);
