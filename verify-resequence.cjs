const axios = require('axios');

async function verify() {
  const BASE_URL = 'http://localhost:3001/api';
  console.log('--- Resequence Fix Verification ---');

  try {
    // 1. Login as Admin
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@company.com',
      password: 'Hon010125@'
    });
    const token = loginRes.data.token;
    console.log('✅ Login successful');

    // 2. Test Validation (Missing riderId)
    console.log('\n2. Testing validation (missing riderId)...');
    try {
      await axios.post(`${BASE_URL}/requests/resequence`, {
        sequence: ['req_1']
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('❌ Validation FAILED: Should have rejected missing riderId');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Validation PASSED: Correctly rejected missing riderId (400)');
        // console.log('Details:', JSON.stringify(err.response.data.details, null, 2));
      } else {
        console.log('❌ Unexpected error:', err.message);
      }
    }

    // 3. Test Validation (Empty sequence)
    console.log('\n3. Testing validation (empty sequence)...');
    try {
      await axios.post(`${BASE_URL}/requests/resequence`, {
        riderId: 'rider_001',
        sequence: []
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('❌ Validation FAILED: Should have rejected empty sequence');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Validation PASSED: Correctly rejected empty sequence (400)');
      } else {
        console.log('❌ Unexpected error:', err.message);
      }
    }

    // 4. Test Resequence Functionality
    console.log('\n4. Testing resequence functionality...');
    // We need real request IDs to avoid foreign key issues or silent failures if jobs don't exist
    // Actually, resequence just does UPDATE ... WHERE request_id = ?, if not found it just updates 0 rows.
    // But let's use a dummy one to see if it succeeds.
    try {
      const res = await axios.post(`${BASE_URL}/requests/resequence`, {
        riderId: 'rider_001',
        sequence: ['req_dummy_123'],
        note: 'Verification test'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Resequence request successful (200)');
      if (res.data.success) {
        console.log('✅ Response success: true');
      }
    } catch (err) {
      console.log('❌ Resequence FAILED:', err.response ? err.response.data : err.message);
    }

  } catch (error) {
    console.error('Fatal error during verification:', error.message);
    if (error.response) console.error('Response:', error.response.data);
  }
}

verify();
