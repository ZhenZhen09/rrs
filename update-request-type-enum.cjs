const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function updateRequestType() {
  console.log('🔗 Connecting to database to update request_type ENUM...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🛠️ Modifying request_type ENUM in delivery_requests table...');
    
    await connection.execute(`ALTER TABLE delivery_requests MODIFY COLUMN request_type ENUM(
      'Asset Management',
      'Bank Transaction',
      'BIR Compliance',
      'Cash Collection',
      'Check Deposit / Encashment',
      'Check Retrieval',
      'Client Coordination',
      'Client Gifting',
      'Contract Retrieval',
      'Countering',
      'Delivery',
      'Drop-off',
      'Fullfillment',
      'General Errands',
      'Government Compliance',
      'Internal Transfer',
      'Mandatory Benefits',
      'Marketing Collateral',
      'Messenger Transfer',
      'Notarization',
      'On-site Assistance',
      'Passbook / Statement Update',
      'Permit Processing',
      'Petty Cash Liquidation',
      'Pickup',
      'Purchasing / Errand',
      'Recruitment Logistics',
      'Signature Chasing',
      'Special Service / Others',
      'Statutory Benefits',
      'Tax & Treasury'
    ) NOT NULL DEFAULT 'Delivery'`);
    
    console.log('✅ Successfully updated request_type ENUM to include all 31 categories.');

  } catch (error) {
    console.error('❌ SQL Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateRequestType();
