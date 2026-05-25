const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  console.log('🚀 Starting DB Hardening Migration (Slice 3)...');

  const indexes = [
    {
      name: 'idx_rider_active_tasks',
      columns: ['assigned_rider_id', 'status', 'delivery_status', 'delivery_date'],
      description: 'Optimizes the "Today", "Overdue", and "Active" lists for riders.'
    },
    {
      name: 'idx_personnel_requests',
      columns: ['requester_id', 'requester_department', 'created_at'],
      description: 'Optimizes dashboard loading for Personnel.'
    },
    {
      name: 'idx_admin_global_status',
      columns: ['status', 'delivery_status', 'updated_at'],
      description: 'Optimizes the Dispatch Console for Admins.'
    },
    {
      name: 'idx_delivery_date_window',
      columns: ['delivery_date', 'time_window'],
      description: 'Optimizes Availability checks and Calendar views.'
    }
  ];

  try {
    for (const idx of indexes) {
      console.log(`\n🔹 Applying: ${idx.name}`);
      console.log(`   Desc: ${idx.description}`);
      
      // We check if index exists first to avoid errors on re-run
      const [existing] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = ? 
        AND table_name = 'delivery_requests' 
        AND index_name = ?
      `, [process.env.DB_NAME || 'rider_scheduling', idx.name]);

      if (existing[0].count > 0) {
        console.log(`   ✅ Index already exists. Skipping.`);
        continue;
      }

      await pool.query(`
        CREATE INDEX ${idx.name} 
        ON delivery_requests (${idx.columns.join(', ')})
      `);
      console.log(`   ✅ Success.`);
    }

    console.log('\n⭐ DB Performance Hardening Complete!');
  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

runMigration();
