const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const dotenv = require('dotenv');
const path = require('path');

// Load env from the server folder (where the DB config is)
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function updateAdmin() {
  console.log('Connecting to database...');
  
  // Use same logic as server/db.ts
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Hashing password...');
    const hashedPassword = await argon2.hash('password');

    console.log('Updating user: admin@company.com');
    // Update the super admin account
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ?, require_password_reset = 0, status = "active" WHERE email = ?',
      [hashedPassword, 'admin@company.com']
    );

    if (result.affectedRows > 0) {
      console.log('✅ SUCCESS: admin@company.com password is now "password"');
      console.log('✅ Verification bypassed and account activated.');
    } else {
      console.log('❌ ERROR: admin@company.com not found in the users table.');
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateAdmin();
