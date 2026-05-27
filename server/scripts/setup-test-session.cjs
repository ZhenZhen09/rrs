const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const dotenv = require('dotenv');

dotenv.config({ path: 'server/.env' });

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const pw = await argon2.hash('password');
  const id = 'rider_sync_test';
  
  await pool.query('INSERT IGNORE INTO users (id, email, password, role, name, status) VALUES (?, ?, ?, ?, ?, ?)', 
    [id, 'sync@test.com', pw, 'rider', 'Sync Tester', 'active']);
  
  console.log('✅ Seeded sync@test.com / password');
  await pool.end();
}

seed().catch(console.error);
