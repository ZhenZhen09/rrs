const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 3001;

function createRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  console.log('--- STARTING LIVE TRACKING TEST ---');

  // 1. Generate Rider Token
  const riderToken = jwt.sign(
    { id: 'rider_001', email: 'rider1@company.com', role: 'rider' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  // 2. Update Rider Location
  console.log('Step 1: Updating rider location...');
  const testLat = 14.5995;
  const testLng = 120.9842;
  
  const updateRes = await createRequest({
    hostname: 'localhost',
    port: PORT,
    path: '/api/users/location',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `authToken=${riderToken}`
    }
  }, {
    lat: testLat,
    lng: testLng,
    requestId: 'idle'
  });

  console.log('Update Response:', updateRes.statusCode, updateRes.data);

  if (updateRes.statusCode !== 200) {
    console.error('FAILED: Could not update location');
    process.exit(1);
  }

  // 3. Generate Admin Token
  const adminToken = jwt.sign(
    { id: 'admin_001', email: 'admin@company.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  // 4. Get Live Riders as Admin
  console.log('\nStep 2: Fetching live riders as admin...');
  const liveRes = await createRequest({
    hostname: 'localhost',
    port: PORT,
    path: '/api/users/riders/live',
    method: 'GET',
    headers: {
      'Cookie': `authToken=${adminToken}`
    }
  });

  console.log('Live Riders Response:', liveRes.statusCode);
  
  if (liveRes.statusCode !== 200) {
    console.error('FAILED: Could not fetch live riders');
    process.exit(1);
  }

  const rider = liveRes.data.find(r => r.id === 'rider_001');
  
  if (!rider) {
    console.error('FAILED: rider_001 not found in live list');
    process.exit(1);
  }

  console.log('Rider Data in Live List:');
  console.log('- Online:', rider.is_online);
  console.log('- Lat:', rider.current_lat);
  console.log('- Lng:', rider.current_lng);

  const latMatched = Math.abs(Number(rider.current_lat) - testLat) < 0.0001;
  const lngMatched = Math.abs(Number(rider.current_lng) - testLng) < 0.0001;

  if (rider.is_online && latMatched && lngMatched) {
    console.log('\n✅ SUCCESS: Admin can see live rider location!');
  } else {
    console.error('\n❌ FAILED: Data mismatch');
    console.log('Expected:', { online: true, lat: testLat, lng: testLng });
    console.log('Actual:', { online: rider.is_online, lat: rider.current_lat, lng: rider.current_lng });
    process.exit(1);
  }
}

runTest().catch(console.error);
