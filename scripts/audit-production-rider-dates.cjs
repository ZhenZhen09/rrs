const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dateStrings: true,
    timezone: '+08:00',
  });

  const [dbRows] = await conn.execute(`
    SELECT
      CURRENT_DATE() AS db_current_date,
      CURRENT_TIMESTAMP() AS db_current_timestamp,
      @@global.time_zone AS global_time_zone,
      @@session.time_zone AS session_time_zone
  `);

  const [jobs] = await conn.execute(`
    SELECT
      request_id,
      delivery_date,
      status,
      delivery_status,
      assigned_rider_id,
      recipient_name,
      updated_at
    FROM delivery_requests
    WHERE assigned_rider_id IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 20
  `);

  const today = dbRows[0].db_current_date;
  const tomorrow = new Date(`${today}T00:00:00+08:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-');

  const terminal = new Set(['completed', 'delivered', 'failed', 'cancelled']);
  const classified = jobs.map((job) => {
    const deliveryDate = String(job.delivery_date).substring(0, 10);
    const approved = job.status === 'approved';
    const active = !terminal.has(job.delivery_status);
    let tab = 'not-visible';
    if (approved && active && deliveryDate === today) tab = 'today';
    if (approved && active && deliveryDate < today) tab = 'overdue';
    if (approved && active && deliveryDate === tomorrowStr) tab = 'tomorrow';
    return {
      request_id: job.request_id,
      delivery_date: deliveryDate,
      status: job.status,
      delivery_status: job.delivery_status,
      assigned_rider_id: job.assigned_rider_id,
      tab,
    };
  });

  let simulation = null;
  if (process.argv.includes('--simulate-approval')) {
    await conn.beginTransaction();
    try {
      const prefix = `audit_${Date.now()}`;
      const riderId = 'audit_rider_rollback';
      const baseValues = [
        'audit_requester_rollback',
        'Rollback Audit',
        'QA',
        '08:00 - 09:00',
        'Audit Pickup',
        'Audit Dropoff',
        'Audit Recipient',
        '09000000000',
        'Delivery/Pickup',
        'Medium',
        'submitted_waiting',
        'pending',
      ];

      const rowsToInsert = [
        [`${prefix}_overdue`, `DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)`],
        [`${prefix}_today`, `CURRENT_DATE()`],
        [`${prefix}_tomorrow`, `DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)`],
      ];

      for (const [id, dateExpr] of rowsToInsert) {
        await conn.execute(`
          INSERT INTO delivery_requests (
            request_id, requester_id, requester_name, requester_department,
            delivery_date, time_window, pickup_address, dropoff_address,
            recipient_name, recipient_contact, request_type, urgency_level,
            status, delivery_status
          ) VALUES (?, ?, ?, ?, ${dateExpr}, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, ...baseValues]);

        await conn.execute(`
          UPDATE delivery_requests
          SET status = 'approved',
              delivery_status = 'assigned',
              assigned_rider_id = ?,
              assigned_rider_name = 'Rollback Audit Rider',
              admin_remark = 'Rollback-only approval simulation'
          WHERE request_id = ?
        `, [riderId, id]);
      }

      const [simRows] = await conn.execute(`
        SELECT request_id, delivery_date, status, delivery_status, assigned_rider_id
        FROM delivery_requests
        WHERE assigned_rider_id = ?
        ORDER BY delivery_date ASC
      `, [riderId]);

      const [simCounts] = await conn.execute(`
        SELECT
          COUNT(CASE
            WHEN delivery_date = CURRENT_DATE()
            AND status = 'approved'
            AND delivery_status NOT IN ('completed', 'delivered', 'failed', 'cancelled')
            THEN 1 END) AS today,
          COUNT(CASE
            WHEN delivery_date < CURRENT_DATE()
            AND status = 'approved'
            AND delivery_status NOT IN ('completed', 'delivered', 'failed', 'cancelled')
            THEN 1 END) AS overdue
        FROM delivery_requests
        WHERE assigned_rider_id = ?
      `, [riderId]);

      simulation = {
        note: 'Inserted and approved three rows inside a transaction, then rolled back.',
        countsQuery: simCounts[0],
        tabClassification: simRows.map((job) => {
          const deliveryDate = String(job.delivery_date).substring(0, 10);
          let tab = 'not-visible';
          if (deliveryDate === today) tab = 'today';
          if (deliveryDate < today) tab = 'overdue';
          if (deliveryDate === tomorrowStr) tab = 'tomorrow';
          return { ...job, delivery_date: deliveryDate, tab };
        }),
      };
    } finally {
      await conn.rollback();
    }
  }

  console.log(JSON.stringify({
    database: dbRows[0],
    derived: { today, tomorrow: tomorrowStr },
    recentAssignedJobs: classified,
    simulation,
  }, null, 2));

  await conn.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
