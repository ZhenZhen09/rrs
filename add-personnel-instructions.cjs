const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  console.log('Connected to database.');

  try {
    console.log('Adding personnel_instructions column to delivery_requests...');
    await connection.query(`
      ALTER TABLE delivery_requests 
      ADD COLUMN personnel_instructions TEXT AFTER urgency_level;
    `);
    console.log('Successfully added personnel_instructions column.');

    // Optional: Migrate existing instructions from admin_remark to personnel_instructions
    console.log('Migrating existing instructions from admin_remark...');
    await connection.query(`
      UPDATE delivery_requests 
      SET personnel_instructions = admin_remark 
      WHERE admin_remark LIKE 'Instructions: %' AND personnel_instructions IS NULL;
    `);
    
    // Clean up admin_remark for those migrated
    await connection.query(`
      UPDATE delivery_requests 
      SET admin_remark = NULL 
      WHERE admin_remark LIKE 'Instructions: %' AND personnel_instructions IS NOT NULL;
    `);
    
    console.log('Migration complete.');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column personnel_instructions already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await connection.end();
  }
}

migrate();
