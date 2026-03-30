const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function migrate() {
  console.log('🔗 Connecting to database for refactoring...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🛠️ Adding pickup contact fields to delivery_requests...');
    
    // Add new columns
    await connection.execute(`
      ALTER TABLE delivery_requests 
      ADD COLUMN IF NOT EXISTS pickup_contact_name VARCHAR(255) AFTER dropoff_landmarks,
      ADD COLUMN IF NOT EXISTS pickup_contact_mobile VARCHAR(50) AFTER pickup_contact_name
    `);

    console.log('🛠️ Updating request_type ENUM to include "Delivery/Pickup"...');
    
    // Get current enum values to preserve them while adding the new one
    await connection.execute(`
      ALTER TABLE delivery_requests MODIFY COLUMN request_type ENUM(
        'Asset Management', 'Bank Transaction', 'BIR Compliance', 'Cash Collection',
        'Check Deposit / Encashment', 'Check Retrieval', 'Client Coordination',
        'Client Gifting', 'Contract Retrieval', 'Countering', 'Delivery',
        'Delivery/Pickup', 'Drop-off', 'Fullfillment', 'General Errands',
        'Government Compliance', 'Internal Transfer', 'Mandatory Benefits',
        'Marketing Collateral', 'Messenger Transfer', 'Notarization',
        'On-site Assistance', 'Passbook / Statement Update', 'Permit Processing',
        'Petty Cash Liquidation', 'Pickup', 'Purchasing / Errand',
        'Recruitment Logistics', 'Signature Chasing', 'Special Service / Others',
        'Statutory Benefits', 'Tax & Treasury'
      ) NOT NULL DEFAULT 'Delivery/Pickup'
    `);
    
    console.log('✅ Database refactoring complete.');

  } catch (error) {
    console.error('❌ Migration Error:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
