/**
 * Mobile Location Simulation Script (LOCAL)
 */

const API_BASE_URL = 'http://localhost:3001/api';

async function runSimulation() {
  console.log('🚀 Starting Local Rider Location Simulation...');
// 1. Login as Rider
const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@company.com', password: 'password' })
});

  
  const loginData = await loginRes.json();
  const { token, user } = loginData;
  console.log(`✅ Logged in locally as ${user.name}`);

  for (let i = 0; i < 3; i++) {
    const lat = 14.5995 + (i * 0.0001);
    const lng = 120.9842 + (i * 0.0001);
    console.log(`📡 Local Ping ${i+1}/3: [${lat}, ${lng}]`);
    
    await fetch(`${API_BASE_URL}/users/location`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, requestId: 'idle', riderId: user.id, heading: 45, accuracy: 10, timestamp: Date.now() })
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('⭐ Local Simulation Complete.');
}

runSimulation().catch(console.error);
