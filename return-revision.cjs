const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function returnForRevision() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    // ID from snapshot was #79865765
    const [result] = await connection.execute(
      "UPDATE delivery_requests SET status = 'returned_for_revision', admin_remark = 'Please clarify task instructions' WHERE request_id LIKE '%79865765'"
    );

    if (result.affectedRows > 0) {
      console.log('✅ SUCCESS: Request #79865765 returned for revision.');
    } else {
      console.log('❌ ERROR: Request not found.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

returnForRevision();
