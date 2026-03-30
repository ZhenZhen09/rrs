const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rider_scheduling'
  });

  try {
    console.log('Updating delivery_requests status enum...');
    await connection.execute(`
      ALTER TABLE delivery_requests 
      MODIFY COLUMN status ENUM('pending', 'approved', 'disapproved', 'returned_for_revision', 'submitted_waiting', 'cancelled') DEFAULT 'pending'
    `);
    console.log('Successfully updated status enum.');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await connection.end();
  }
}

updateSchema();
