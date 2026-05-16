const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const SESSION_FILE = path.join(process.cwd(), 'test-results/e2e-session.json');

async function setup() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Find an active request assigned to a rider
    const [rows] = await pool.execute(
      "SELECT dr.request_id, dr.assigned_rider_id, u.email, u.name, u.role, u.department FROM delivery_requests dr JOIN users u ON dr.assigned_rider_id = u.id WHERE dr.delivery_status = 'assigned' LIMIT 1"
    );

    if (rows.length === 0) {
      console.error('No active assigned requests found in DB. Please create one.');
      process.exit(1);
    }

    const request = rows[0];
    const riderToken = jwt.sign(
      { id: request.assigned_rider_id, email: request.email, role: request.role, department: request.department },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const sessionData = {
      requestId: request.request_id,
      riderToken: riderToken,
      riderId: request.assigned_rider_id
    };

    if (!fs.existsSync(path.dirname(SESSION_FILE))) {
      fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log('✅ Test session initialized:', SESSION_FILE);
  } finally {
    await pool.end();
  }
}

setup().catch(console.error);
