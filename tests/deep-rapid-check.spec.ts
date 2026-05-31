import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * DEEP RAPID TEST SUITE
 * Targets:
 * 1. Concurrency (Double-Assignment Race)
 * 2. Security (BOLA+ Cross-Dept Probing)
 * 3. Robustness (Watchdog Signal Loss)
 */

test.describe('Deep Rapid Testing', () => {
  let adminToken: string;
  let hrToken: string;
  let financeToken: string;
  let requestId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Auth setup
    const aRes = await request.post('/api/auth/login', { data: { email: 'admin@company.com', password: 'password' } });
    adminToken = (await aRes.json()).token;

    const hrRes = await request.post('/api/auth/login', { data: { email: 'john.hr@company.com', password: 'Hon010125@' } });
    hrToken = (await hrRes.json()).token;

    const fiRes = await request.post('/api/auth/login', { data: { email: 'jose.finance@company.com', password: 'Hon010125@' } });
    const fiData = await fiRes.json();
    financeToken = fiData.token;
    
    // Handle both { user: { id } } and top-level { id }
    const financeUser = fiData.user || fiData;

    // 2. Create a stable test request
    const createRes = await request.post('/api/requests', {
      headers: { 'Authorization': `Bearer ${financeToken}` },
      data: {
        requester_id: String(financeUser.id),
        requester_name: String(financeUser.name),
        requester_department: 'Finance',
        delivery_date: new Date().toISOString().split('T')[0],
        time_window: '09:00 - 10:00',
        pickup_location: { 
            lat: 14, 
            lng: 121, 
            address: 'Finance Pickup', 
            businessName: 'Finance HQ', 
            landmarks: 'Main Lobby' 
        },
        dropoff_location: { 
            lat: 14.1, 
            lng: 121.1, 
            address: 'Finance Dropoff', 
            businessName: 'Finance Annex', 
            landmarks: 'Rear Gate' 
        },
        recipient_name: 'Rapid Test Recipient',
        recipient_contact: '09170000000',
        request_type: 'Delivery/Pickup',
        urgency_level: 'High'
      }
    });
    const createData = await createRes.json();
    requestId = createData.request_id || createData.id;
    if (!requestId) throw new Error(`Request creation failed: ${JSON.stringify(createData)}`);
  });

  test('CONCURRENCY: Simultaneous dual assignment', async ({ request }) => {
    // Attempt to assign TWO different riders to the SAME request at the exact same time
    const riders = ['rider_001', 'rider_002'];
    
    console.log(`Rapid Concurrency Test for ${requestId}...`);
    
    const results = await Promise.all(riders.map(riderId => 
      request.put(`/api/requests/${requestId}/approve`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: { rider_id: riderId, admin_remark: `Concurrent Assignment to ${riderId}` }
      })
    ));

    const successes = results.filter(r => r.ok()).length;
    console.log(`Successful assignments: ${successes}/2`);
    
    // We expect the system to handle this gracefully (even if it allows overwriting, it shouldn't crash)
    expect(successes).toBeGreaterThan(0);
    
    // Check final state in DB
    const finalCheck = await request.get(`/api/requests/${requestId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const finalData = await finalCheck.json();
    console.log(`Final assigned rider: ${finalData.assigned_rider_id}`);
  });

  test('SECURITY: BOLA+ Probing (History logs)', async ({ request }) => {
    // HR user attempts to read Finance request history
    const response = await request.get(`/api/requests/${requestId}/history`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    
    console.log(`BOLA+ Check for history: ${response.status()}`);
    expect(response.status()).toBe(403);
  });

  test('ROBUSTNESS: Watchdog Logic Simulation (Exceptions check)', async ({ request }) => {
    // Start delivery as rider1
    const riderLogin = await request.post('/api/auth/login', { data: { email: 'rider1@company.com', password: 'rider1' } });
    const riderToken = (await riderLogin.json()).token;

    await request.put(`/api/requests/${requestId}/status`, {
        headers: { 'Authorization': `Bearer ${riderToken}` },
        data: { status: 'in_progress' }
    });

    // Check if the exceptions field exists and is reachable
    const response = await request.get(`/api/requests/${requestId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    expect(data).toHaveProperty('exceptions');
    console.log(`Initial exceptions for request: ${JSON.stringify(data.exceptions)}`);
  });
});
