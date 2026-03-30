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
    // Add require_password_reset column
    await connection.execute(`
      ALTER TABLE users ADD COLUMN require_password_reset BOOLEAN DEFAULT TRUE
    `);
    console.log('Added require_password_reset column to users table');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column require_password_reset already exists');
    } else {
      console.error('Error adding require_password_reset column:', e.message);
    }
  }

  try {
    // Modify password_hash to ensure Argon2 compatibility (VARCHAR(255) is enough, but checking anyway)
    await connection.execute(`
      ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
    `);
    console.log('Modified password_hash column to VARCHAR(255)');
  } catch (e) {
    console.error('Error modifying password_hash column:', e.message);
  }

  process.exit(0);
}

main().catch(console.error);
