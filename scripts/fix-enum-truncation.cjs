const { pool } = require('./server/db');

async function run() {
  try {
    console.log('🚀 Attempting to add Credit Collection to request_type...');
    
    // Exact list from schema.json + 'Credit Collection'
    const newEnum = "ENUM('Asset Management','Bank Transaction','BIR Compliance','Cash Collection','Check Deposit / Encashment','Check Retrieval','Client Coordination','Client Gifting','Contract Retrieval','Countering','Delivery','Delivery/Pickup','Drop-off','Fullfillment','General Errands','Government Compliance','Internal Transfer','Mandatory Benefits','Marketing Collateral','Messenger Transfer','Notarization','On-site Assistance','Passbook / Statement Update','Permit Processing','Petty Cash Liquidation','Pickup','Purchasing / Errand','Recruitment Logistics','Signature Chasing','Special Service / Others','Statutory Benefits','Tax & Treasury','Credit Collection')";
    
    await pool.query(`ALTER TABLE delivery_requests MODIFY COLUMN request_type ${newEnum} NOT NULL DEFAULT 'Delivery/Pickup'`);
    
    console.log('✅ Success!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    process.exit();
  }
}

run();
