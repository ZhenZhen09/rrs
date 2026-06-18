const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function runAudit() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  try {
    console.log('--- SHIFT LOGGING AUDIT ---');
    
    // 1. Check Morning Start Time
    const attendanceResult = await pool.query('SELECT rider_id, status, check_in_time FROM attendance_logs WHERE date = CURDATE()');
    const attendance = attendanceResult[0];
    console.log('Morning Check-ins Found:', attendance.length);
    if (attendance.length > 0) {
      console.log('✅ PASS: System records morning check-in time:', attendance[0].check_in_time);
    } else {
      console.log('❌ FAIL: No check-in records found for today.');
    }

    // 2. Check Off-Duty Time & Reason
    const eventResult = await pool.query(`
      SELECT rider_id, timestamp, metadata 
      FROM movement_events 
      WHERE event_type = 'duty_off' AND DATE(timestamp) = CURDATE() 
      ORDER BY timestamp DESC LIMIT 1
    `);
    const events = eventResult[0];

    if (events.length > 0) {
      const meta = typeof events[0].metadata === 'string' ? JSON.parse(events[0].metadata) : events[0].metadata;
      const reason = meta?.handover_reason;
      console.log('✅ PASS: System records off-duty time:', events[0].timestamp);
      console.log('✅ PASS: System records handover reason:', reason || 'None');
    } else {
      console.log('⚠️ INFO: No Off-Duty events found for today yet.');
    }

    // 3. CHECK FOR DASHBOARD READINESS
    console.log('\n--- ARCHITECTURE GAP ANALYSIS ---');
    const columnResult = await pool.query('SHOW COLUMNS FROM attendance_logs');
    const columns = columnResult[0];
    const hasOffDutyCol = columns.map((c) => c.Field).includes('off_duty_time');
    
    if (!hasOffDutyCol) {
      console.log('❌ FAIL: attendance_logs table is missing "off_duty_time" column.');
      console.log('   Plan required to refactor Admin Attendance page.');
    } else {
      console.log('✅ PASS: off_duty_time column exists.');
    }

  } catch (err) {
    console.error('Audit crashed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

runAudit();
