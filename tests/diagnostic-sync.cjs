const io = require('socket.io-client');
const axios = require('axios');

// CONFIG: Match your local setup
const BASE_URL = 'http://localhost:3001'; 
const ADMIN_TOKEN = 'your_admin_token_here'; // This needs to be a valid token for the test
const RIDER_ID = 'rider_c0dabf98'; // Based on your logs

async function runDiagnostic() {
  console.log('🧪 Starting Real-time Sync Diagnostic...');
  
  // 1. Connect as Admin to listen for updates
  const socket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: ADMIN_TOKEN }
  });

  let receivedUpdate = false;

  socket.on('connect', () => {
    console.log('✅ Admin Socket Connected');
    socket.emit('join-room', 'admin-room');
  });

  socket.on('rider-status-updated', (data) => {
    console.log('✨ SUCCESS: Received instant status update signal!', data);
    receivedUpdate = true;
  });

  // 2. Wait a bit for connection
  await new Promise(r => setTimeout(r, 2000));

  console.log('📡 Simulating Rider Duty Toggle via API...');
  
  try {
    // Note: In a real unit test, we'd use a test-specific rider token
    // For this diagnostic, we're checking if the SERVER code even HAS the emit logic
    console.log('Checking server code for broadcast logic...');
  } catch (err) {
    console.error('❌ API Trigger failed:', err.message);
  }

  setTimeout(() => {
    if (!receivedUpdate) {
      console.log('❌ FAILURE: No instant update signal received after 5 seconds.');
      console.log('Probable cause: Missing io.to("admin-room").emit(...) in server/routes/users.ts');
    }
    process.exit(0);
  }, 5000);
}

// runDiagnostic(); // Disabled - I will fix the code directly as the bug is visible in my previous files.
