import { test, expect } from '@playwright/test';

test.describe('BOLA Prevention', () => {
  let financeToken: string;
  let hrToken: string;
  let requestId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Login as Finance Personnel
    const financeLogin = await request.post('/api/auth/login', {
      data: { email: 'jose.finance@company.com', password: 'jose' }
    });
    const financeData = await financeLogin.json();
    financeToken = financeData.token;
    const financeUser = financeData.user || financeData;

    // 2. Login as HR Personnel
    const hrLogin = await request.post('/api/auth/login', {
      data: { email: 'john.hr@company.com', password: 'john' }
    });
    const hrData = await hrLogin.json();
    hrToken = hrData.token;
    const hrUser = hrData.user || hrData;

    // 3. Create a request as Finance
    const createRes = await request.post('/api/requests', {
      headers: { 'Authorization': `Bearer ${financeToken}` },
      data: {
        requester_id: String(financeUser.id),
        requester_name: String(financeUser.name),
        requester_department: String(financeUser.department),
        delivery_date: new Date().toISOString().split('T')[0],
        time_window: '09:00 - 10:00',
        pickup_location: { 
            lat: 14.5, 
            lng: 121.0, 
            address: 'Finance Dept',
            businessName: 'Finance HQ',
            landmarks: 'Near elevator'
        },
        dropoff_location: { 
            lat: 14.6, 
            lng: 121.1, 
            address: 'HR Dept',
            businessName: 'HR Office',
            landmarks: 'Beside reception'
        },
        recipient_name: 'HR Manager',
        recipient_contact: '09170000000',
        request_type: 'Delivery/Pickup',
        urgency_level: 'Normal'
      }
    });
    const requestData = await createRes.json();
    requestId = requestData.request_id || requestData.id;
    console.log(`Created test request: ${requestId}`);
    if (!requestId) {
        console.error('Request creation failed:', requestData);
    }
  });

  test('Personnel cannot access history of request they are not authorized for', async ({ request }) => {
    const response = await request.get(`/api/requests/${requestId}/history`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    
    expect(response.status()).toBe(403);
  });

  test('Personnel cannot access tracking of request they are not authorized for', async ({ request }) => {
    const response = await request.get(`/api/requests/${requestId}/tracking`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    
    expect(response.status()).toBe(403);
  });
});
