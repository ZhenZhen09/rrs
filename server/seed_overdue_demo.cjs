const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const DEMO_DATE = '2026-09-30';
const RIDER_ID = 'rider_c0dabf98';
const RIDER_NAME = 'test';

const requests = [
  ['OVERDUE-DEMO-01', 'Finance - signed documents', 'High', 'assigned', null],
  ['OVERDUE-DEMO-02', 'HR - employee records', 'Urgent', 'in_progress', null],
  ['OVERDUE-DEMO-03', 'Operations - supply transfer', 'Medium', 'assigned', null],
  ['OVERDUE-DEMO-04', 'Treasury - bank envelope', 'Urgent', 'in_progress', ['signal_lost']],
  ['OVERDUE-DEMO-05', 'Marketing - event materials', 'Low', 'assigned', null],
];

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  try {
    const [dutyResult] = await db.execute(
      'UPDATE users SET is_on_duty = 1 WHERE id = ?',
      [RIDER_ID],
    );
    if (dutyResult.affectedRows === 0) {
      console.warn(`Rider ${RIDER_ID} was not found; demo requests will only appear for an account with this rider ID.`);
    }

    for (const [id, instruction, urgency, deliveryStatus, exceptions] of requests) {
      await db.execute(
        `INSERT INTO delivery_requests (
          request_id, requester_id, requester_name, requester_department,
          delivery_date, time_window, pickup_lat, pickup_lng, pickup_address,
          dropoff_lat, dropoff_lng, dropoff_address, recipient_name, recipient_contact,
          request_type, urgency_level, personnel_instructions, status,
          assigned_rider_id, assigned_rider_name, delivery_status, exceptions, exception_severity
        ) VALUES (?, 'personnel_001', 'Overdue Demo Requester', 'Operations', ?, '08:00 - 09:00',
          14.5995, 120.9842, 'Demo Building - Dispatch Desk',
          14.6015, 120.9865, 'Demo Building - Receiving Desk', 'Demo Recipient', '09170000000',
          'Delivery/Pickup', ?, ?, 'approved', ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          delivery_date = VALUES(delivery_date), urgency_level = VALUES(urgency_level),
          personnel_instructions = VALUES(personnel_instructions), status = 'approved',
          assigned_rider_id = VALUES(assigned_rider_id), assigned_rider_name = VALUES(assigned_rider_name),
          delivery_status = VALUES(delivery_status), exceptions = VALUES(exceptions),
          exception_severity = VALUES(exception_severity), completed_at = NULL`,
        [id, DEMO_DATE, urgency, instruction, RIDER_ID, RIDER_NAME, deliveryStatus,
          exceptions ? JSON.stringify(exceptions) : null, exceptions ? 'critical' : null],
      );
    }

    const [rows] = await db.execute(
      `SELECT request_id, delivery_date, status, assigned_rider_id, delivery_status, urgency_level, exceptions
       FROM delivery_requests WHERE request_id LIKE 'OVERDUE-DEMO-%' ORDER BY request_id`,
    );
    console.log(`Created/updated ${requests.length} overdue demo requests for ${DEMO_DATE}:`);
    console.log(requests.map(([id]) => id).join(', '));
    console.table(rows);
  } finally {
    await db.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
