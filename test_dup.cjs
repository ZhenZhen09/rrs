const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling'
  });

  // Create a dummy table
  await db.query(`CREATE TABLE IF NOT EXISTS test_dup (
    id INT PRIMARY KEY,
    status VARCHAR(50),
    check_in VARCHAR(50)
  )`);
  
  await db.query(`TRUNCATE TABLE test_dup`);
  
  // Insert initial
  await db.query(`INSERT INTO test_dup (id, status, check_in) VALUES (1, 'absent', 'old_time')`);
  
  // Test update
  await db.query(`
    INSERT INTO test_dup (id, status, check_in) VALUES (1, 'present', 'new_time')
    ON DUPLICATE KEY UPDATE status = 'present', check_in = IF(status != 'present', 'new_time', check_in)
  `);
  
  const [rows] = await db.query('SELECT * FROM test_dup');
  console.log('Result:', rows);
  
  // Drop table
  await db.query('DROP TABLE test_dup');
  await db.end();
}
run().catch(console.error);
