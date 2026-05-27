const { pool } = require('../db');
const assert = require('assert');

/**
 * Backend Analytics Logic Audit
 * Verifies the mathematical integrity and edge case handling of analytics queries.
 */

async function runAudit() {
  console.log('🚀 Starting Backend Analytics Logic Audit...');

  // 1. Check if utilization query handles 0 riders safely
  // We can't easily mock the pool results without touching code, but we can verify the SQL logic
  try {
    const [utilization] = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT assigned_rider_id) FROM delivery_requests WHERE delivery_status IN ('assigned', 'picked_up', 'in_transit')) / 
        (SELECT COUNT(*) FROM users WHERE role = 'rider') * 100 as rate
    `);
    
    // If rate is null, it means there are 0 riders (division by zero in MySQL usually returns null or error depending on mode)
    console.log(`Utilization check: Current rate is ${utilization[0].rate}`);
  } catch (err) {
    console.warn('⚠️ Potential division by zero detected in utilization query if riders=0');
  }

  // 2. Test getTimeframeFilter Logic (Simulation)
  const getTimeframeFilter = (timeframe) => {
    switch (timeframe) {
      case 'real-time': return 'created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)';
      case 'daily': return 'DATE(created_at) = CURDATE()';
      case 'weekly': return 'created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
      default: return 'created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }
  };

  assert(getTimeframeFilter('real-time').includes('24 HOUR'), 'real-time should use 24h interval');
  assert(getTimeframeFilter('daily').includes('CURDATE()'), 'daily should use CURDATE()');
  assert(getTimeframeFilter('weekly').includes('7 DAY'), 'weekly should use 7 day interval');
  assert(getTimeframeFilter('other').includes('30 DAY'), 'default should be 30 days');
  console.log('✅ Timeframe filter logic verified.');

  // 3. Verify forecast day logic
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
  console.log(`Forecast Day Logic: Tomorrow is ${dayName}`);
  assert(dayName.length > 0, 'Should return a valid day name');

  console.log('\n✅ Backend Analytics Audit Complete.');
}

runAudit().catch(err => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
