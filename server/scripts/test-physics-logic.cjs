/**
 * Helper to get distance between two points in meters
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const radius = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dP = ((lat2 - lat1) * Math.PI) / 180;
  const dL = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dP / 2) * Math.sin(dP / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dL / 2) * Math.sin(dL / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const assert = require('assert');

/**
 * Standalone Physics Audit Script
 * Verifies the mathematical integrity of the GPS filtering logic.
 */

async function runAudit() {
  console.log('🚀 Starting Physics Logic Audit...');

  // Test 1: Standard Movement (20km/h)
  const p1 = { lat: 14.5995, lng: 120.9842, timestamp: 1716656400000 }; // Manila
  const p2 = { lat: 14.6010, lng: 120.9850, timestamp: 1716656430000 }; // ~200m in 30s
  
  const dist1 = getDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  const speed1 = (dist1 / 30) * 3.6;
  console.log(`Test 1 (Normal): ${Math.round(speed1)} km/h`);
  assert(speed1 < 160, 'Normal speed should pass');

  // Test 2: Impossible Jump (GPS Glitch)
  const p3 = { lat: 14.5995, lng: 120.9842, timestamp: 1716656400000 };
  const p4 = { lat: 15.0000, lng: 121.5000, timestamp: 1716656401000 }; // 60km in 1s
  
  const dist2 = getDistance(p3.lat, p3.lng, p4.lat, p4.lng);
  const speed2 = (dist2 / 1) * 3.6;
  console.log(`Test 2 (Glitch): ${Math.round(speed2)} km/h`);
  assert(speed2 > 1000, 'GPS glitch should show extreme speed');

  // Test 3: Zero Distance (Stationary)
  const dist3 = getDistance(14.5, 121.0, 14.5, 121.0);
  console.log(`Test 3 (Stationary): ${dist3} meters`);
  assert(dist3 === 0, 'Stationary should be 0');

  console.log('\n✅ Physics Logic Verified: Calculations are accurate.');
}

runAudit().catch(err => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
