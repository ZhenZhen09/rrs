const { pool } = require('./server/db');

async function checkSchema() {
  try {
    const [rows] = await pool.query('DESCRIBE delivery_requests');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    process.exit();
  }
}

checkSchema();
