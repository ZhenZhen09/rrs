const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function fixSchema() {
  console.log('🔗 Connecting to database to apply schema updates...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🛠️ Checking for missing columns in users table...');
    
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('last_password_change')) {
      console.log('➕ Adding column: last_password_change');
      await connection.execute('ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP NULL DEFAULT NULL');
      console.log('✅ Added: last_password_change');
    } else {
      console.log('ℹ️ Column already exists: last_password_change');
    }

    if (!columnNames.includes('require_password_reset')) {
      console.log('➕ Adding column: require_password_reset');
      await connection.execute('ALTER TABLE users ADD COLUMN require_password_reset TINYINT(1) DEFAULT 1');
      console.log('✅ Added: require_password_reset');
    } else {
      console.log('ℹ️ Column already exists: require_password_reset');
    }

    // Ensure super admin is verified
    await connection.execute('UPDATE users SET require_password_reset = 0 WHERE email = "admin@company.com"');
    console.log('✅ Verified: admin@company.com set to verified status.');

    console.log('\n🚀 Database schema is now 100% UP TO DATE.');

  } catch (error) {
    console.error('❌ SQL Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixSchema();
