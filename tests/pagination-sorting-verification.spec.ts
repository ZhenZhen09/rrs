import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'https://rrs-vhgr.onrender.com';

test.describe('Pagination & Sorting Bug Verification', () => {
  let adminToken: string;
  let personnelToken: string;
  let riderId: string;
  let createdRequestIds: string[] = [];

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();

    // 1. Login as Admin to get token and find a rider
    const adminLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: 'admin@company.com', password: 'password' }
    });
    const adminData = await adminLogin.json();
    adminToken = adminData.token;

    if (!adminToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
    }

    // 2. Find a rider to assign jobs to
    const ridersList = await request.get(`${API_BASE_URL}/api/users`, {
      params: { role: 'rider' },
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const riders = await ridersList.json();
    const riderListArray = Array.isArray(riders) ? riders : (riders.data || []);
    
    if (riderListArray.length === 0) {
       riderId = 'rider_test';
    } else {
       riderId = riderListArray[0].id;
    }
  });

  test('Active tasks should stay at the top even if they are older than 10 newer completed tasks', async ({ request }) => {
    const baseRequestData = {
      requester_id: 'personnel_001',
      requester_name: 'John Personnel',
      requester_department: 'Human Resources',
      delivery_date: new Date().toISOString().split('T')[0],
      time_window: '09:00 - 12:00',
      pickup_location: { lat: 14.5, lng: 121.0, address: 'Old Pickup', businessName: '', landmarks: '' },
      dropoff_location: { lat: 14.6, lng: 121.1, address: 'Old Dropoff', businessName: '', landmarks: '' },
      pickup_contact_name: 'John P',
      pickup_contact_mobile: '09123456789',
      recipient_name: 'Target Recipient',
      recipient_contact: '09123456789',
      request_type: 'Delivery',
      urgency_level: 'Medium',
      personnel_instructions: 'Test instructions'
    };

    // 1. Create the "Target" (Oldest) Active Request
    const targetRes = await request.post(`${API_BASE_URL}/api/requests`, {
      data: baseRequestData,
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const targetData = await targetRes.json();
    const targetId = targetData.request_id;
    
    if (!targetId) {
      throw new Error(`Failed to create target request: ${JSON.stringify(targetData)}`);
    }
    
    createdRequestIds.push(targetId);

    // 2. Create 11 "Filler" (Newer) Requests
    console.log(`Creating 11 filler requests for rider ${riderId}...`);
    for (let i = 0; i < 11; i++) {
      const fillerRes = await request.post(`${API_BASE_URL}/api/requests`, {
        data: { ...baseRequestData, recipient_name: `Filler Recipient ${i}` },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const fillerData = await fillerRes.json();
      if (fillerData.request_id) {
        createdRequestIds.push(fillerData.request_id);
      }
    }

    // 3. Admin: Approve ALL requests and assign to the rider
    console.log('Admin: Approving all requests...');
    for (const id of createdRequestIds) {
      await request.put(`${API_BASE_URL}/api/requests/${id}/approve`, {
        data: { rider_id: riderId, admin_remark: 'Test Approval' },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }

    // 4. Admin: Mark the 11 Newer FILLER requests as COMPLETED
    // The target (first one created) stays ACTIVE (assigned)
    console.log('Admin: Completing filler requests...');
    const fillerIds = createdRequestIds.slice(1);
    for (const id of fillerIds) {
      await request.put(`${API_BASE_URL}/api/requests/${id}/status`, {
        data: { status: 'completed', remark: 'Test completion' },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    }

    // 5. THE TEST: Query Page 1 with limit=10
    console.log('Verification: Querying Page 1 with limit=10...');
    const queryRes = await request.get(`${API_BASE_URL}/api/requests`, {
      params: { limit: 10, rider_id: riderId },
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const queryData = await queryRes.json();
    const tasks = queryData.data || [];

    // 6. ASSERTION
    expect(tasks.length).toBeGreaterThan(0);
    
    console.log('Top 2 tasks on Page 1:');
    tasks.slice(0, 2).forEach((t: any, i: number) => {
      console.log(`[${i}] ID: ${t.request_id} | Status: ${t.status} | Delivery: ${t.delivery_status} | Created: ${t.created_at}`);
    });
    
    const firstTask = tasks[0];
    expect(firstTask.request_id).toBe(targetId);
    expect(firstTask.delivery_status).not.toBe('completed');
  });

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    console.log('Cleaning up test requests...');
    for (const id of createdRequestIds) {
      try {
        await request.put(`${API_BASE_URL}/api/requests/${id}/cancel`, {
          data: { admin_remark: 'Test Cleanup' },
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });
});
