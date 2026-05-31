import { test, expect } from '@playwright/test';

test.describe('BOLA Expansion Validation', () => {
  let financeToken: string;
  let hrToken: string;
  let riderToken: string;
  let financeRequestId: string;
  let hrRequestId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Login as Finance Personnel
    const financeLogin = await request.post('/api/auth/login', {
      data: { email: 'jose.finance@company.com', password: 'Hon010125@' }
    });
    const financeData = await financeLogin.json();
    financeToken = financeData.token;
    const financeUser = financeData.user || financeData;
    expect(financeToken, 'Finance login failed').toBeDefined();

    // 2. Login as HR Personnel
    const hrLogin = await request.post('/api/auth/login', {
      data: { email: 'john.hr@company.com', password: 'Hon010125@' }
    });
    const hrData = await hrLogin.json();
    hrToken = hrData.token;
    const hrUser = hrData.user || hrData;
    expect(hrToken, 'HR login failed').toBeDefined();

    // 3. Login as Rider (CORRECTED EMAIL)
    const riderLogin = await request.post('/api/auth/login', {
      data: { email: 'rider1@company.com', password: 'rider' }
    });
    const riderData = await riderLogin.json();
    riderToken = riderData.token;
    expect(riderToken, 'Rider login failed').toBeDefined();

    const today = new Date().toISOString().split('T')[0];

    // 4. Create a request as Finance
    const financeReqRes = await request.post('/api/requests', {
      headers: { 'Authorization': `Bearer ${financeToken}` },
      data: {
        requester_id: String(financeUser.id),
        requester_name: String(financeUser.name),
        requester_department: String(financeUser.department),
        delivery_date: today,
        time_window: '10:00 - 11:00',
        pickup_location: { lat: 14.5, lng: 121.0, address: 'Finance' },
        dropoff_location: { lat: 14.6, lng: 121.1, address: 'Client A' },
        recipient_name: 'Client A',
        recipient_contact: '09171112222',
        request_type: 'Delivery/Pickup',
        urgency_level: 'Normal'
      }
    });
    const financeReqData = await financeReqRes.json();
    financeRequestId = financeReqData.request_id || financeReqData.id;

    // 5. Create a request as HR
    const hrReqRes = await request.post('/api/requests', {
      headers: { 'Authorization': `Bearer ${hrToken}` },
      data: {
        requester_id: String(hrUser.id),
        requester_name: String(hrUser.name),
        requester_department: String(hrUser.department),
        delivery_date: today,
        time_window: '10:00 - 11:00',
        pickup_location: { lat: 14.5, lng: 121.0, address: 'HR' },
        dropoff_location: { lat: 14.6, lng: 121.1, address: 'Client B' },
        recipient_name: 'Client B',
        recipient_contact: '09173334444',
        request_type: 'Delivery/Pickup',
        urgency_level: 'Normal'
      }
    });
    const hrReqData = await hrReqRes.json();
    hrRequestId = hrReqData.request_id || hrReqData.id;
  });

  test('GET /availability should only return counts for users department (for personnel)', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // HR personnel should only see 1 count for '10:00 - 11:00' if isolated correctly
    const response = await request.get(`/api/requests/availability?date=${today}`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Find the '10:00 - 11:00' window
    const windowData = data.find((d: any) => d.time_window === '10:00 - 11:00');
    
    // CURRENT STATE: windowData.count will be 2 (unisolated)
    // DESIRED STATE: windowData.count should be 1
    console.log(`Availability count for HR: ${windowData?.count}`);
    expect(windowData?.count).toBe(1);
  });

  test('GET /counts should be forbidden for personnel', async ({ request }) => {
    const response = await request.get('/api/requests/counts', {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    
    expect(response.status()).toBe(403);
  });

  test('GET /counts should only count assigned jobs for riders', async ({ request }) => {
    const response = await request.get('/api/requests/counts', {
      headers: { 'Authorization': `Bearer ${riderToken}` }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.today).toBeDefined();
    expect(data.overdue).toBeDefined();
  });
});
