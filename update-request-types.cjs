const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateRequestTypes() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in .env');
    return;
  }

  // Use createConnection with the URL directly
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('🔗 Connected to database...');

  const newTypes = [
    'Asset Management', 'Bank Transaction', 'BIR Compliance', 'Cash Collection',
    'Check Deposit / Encashment', 'Check Retrieval', 'Client Coordination',
    'Client Gifting', 'Contract Retrieval', 'Countering', 'Delivery',
    'Drop-off', 'Fullfillment', 'General Errands', 'Government Compliance',
    'Internal Transfer', 'Mandatory Benefits', 'Marketing Collateral',
    'Messenger Transfer', 'Notarization', 'On-site Assistance',
    'Passbook / Statement Update', 'Permit Processing', 'Petty Cash Liquidation',
    'Pickup', 'Purchasing / Errand', 'Recruitment Logistics', 'Signature Chasing',
    'Statutory Benefits', 'Tax & Treasury', 'Special Service / Others'
  ];

  const enumString = newTypes.map(t => `'${t}'`).join(',');

  try {
    console.log('🛠️ Updating request_type ENUM...');
    await connection.execute(`ALTER TABLE delivery_requests MODIFY COLUMN request_type ENUM(${enumString}) NOT NULL DEFAULT 'Delivery'`);
    console.log('✅ Database schema updated successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

updateRequestTypes();
