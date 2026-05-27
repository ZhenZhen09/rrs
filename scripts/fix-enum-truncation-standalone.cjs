const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });

  try {
    console.log('🚀 Attempting to add Credit Collection to request_type...');
    
    const newEnum = "ENUM('Asset Management','Bank Transaction','BIR Compliance','Cash Collection','Check Deposit / Encashment','Check Retrieval','Client Coordination','Client Gifting','Contract Retrieval','Countering','Delivery','Delivery/Pickup','Drop-off','Fullfillment','General Errands','Government Compliance','Internal Transfer','Mandatory Benefits','Marketing Collateral','Messenger Transfer','Notarization','On-site Assistance','Passbook / Statement Update','Permit Processing','Petty Cash Liquidation','Pickup','Purchasing / Errand','Recruitment Logistics','Signature Chasing','Special Service / Others','Statutory Benefits','Tax & Treasury','Credit Collection')";
    
    await pool.query(`ALTER TABLE delivery_requests MODIFY COLUMN request_type ${newEnum} NOT NULL DEFAULT 'Delivery/Pickup'`);
    
    console.log('✅ Success!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
