const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const dotenv = require('dotenv');
const path = require('path');

// Load env from the server folder (where the DB config is)
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function updateJohn() {
  console.log('Connecting to database...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Hashing password for john.hr@company.com...');
    const hashedPassword = await argon2.hash('password');

    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ?, require_password_reset = 0, status = \'active\' WHERE email = ?',
      [hashedPassword, 'john.hr@company.com']
    );

    if (result.affectedRows > 0) {
      console.log('✅ SUCCESS: john.hr@company.com password is now "password"');
    } else {
      console.log('❌ ERROR: john.hr@company.com not found.');
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateJohn();
