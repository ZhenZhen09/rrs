const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  console.log('Adding MFA columns to users table...');

  try {
    // Add mfa_secret column
    await connection.execute(`
      ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255) DEFAULT NULL
    `);
    console.log('Added mfa_secret column to users table');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column mfa_secret already exists');
    } else {
      console.error('Error adding mfa_secret column:', e.message);
    }
  }

  try {
    // Add mfa_enabled column
    await connection.execute(`
      ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE
    `);
    console.log('Added mfa_enabled column to users table');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column mfa_enabled already exists');
    } else {
      console.error('Error adding mfa_enabled column:', e.message);
    }
  }

  process.exit(0);
}

main().catch(console.error);
