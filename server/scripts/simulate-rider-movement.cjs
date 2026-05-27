/**
 * Mobile Location Simulation Script
 * Triggers real-time broadcasts on the Admin Map via the REST API.
 * (Built-in fetch version for zero dependencies)
 */

const API_BASE_URL = 'https://rrs-vhgr.onrender.com/api';

async function runSimulation() {
  console.log('🚀 Starting Rider Location Simulation...');

  // 1. Login as Rider 1
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rider1@company.com',
      password: 'password'
    })
  });
  
  const loginData = await loginRes.json();
  const { token, user } = loginData;
  console.log(`✅ Logged in as ${user.name} (${user.id})`);

  const baseLat = 14.5995;
  const baseLng = 120.9842;

  // 2. Emit 5 location updates
  for (let i = 0; i < 5; i++) {
    const lat = baseLat + (i * 0.0001);
    const lng = baseLng + (i * 0.0001);
    
    console.log(`📡 Sending Update ${i+1}/5: [${lat}, ${lng}]`);
    
    await fetch(`${API_BASE_URL}/users/location`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lat,
        lng,
        requestId: 'idle',
        riderId: user.id,
        heading: 45,
        accuracy: 10,
        timestamp: Date.now()
      })
    });

    // Wait 2 seconds between updates
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('⭐ Simulation Complete.');
}

runSimulation().catch(err => {
  console.error('❌ Simulation Failed:', err.message);
});
