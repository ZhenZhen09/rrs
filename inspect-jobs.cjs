const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  // Show columns
  const [columns] = await conn.execute('SHOW COLUMNS FROM delivery_requests');
  console.log('Columns:');
  console.log(columns.map(c => c.Field).join(', '));
  
  // Query records
  const [rows] = await conn.execute('SELECT request_id, status, delivery_status, created_at, updated_at, completed_at, recipient_name FROM delivery_requests');
  console.log('Rows count:', rows.length);
  
  // Find #48495229 and #300833
  const targetIds = ['48495229', '300833', '#48495229', '#300833'];
  const matched = rows.filter(r => targetIds.includes(r.request_id) || targetIds.some(tid => r.request_id.includes(tid)));
  console.log('Matched records:', JSON.stringify(matched, null, 2));

  await conn.end();
}
run().catch(console.error);
