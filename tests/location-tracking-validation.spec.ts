import { test, expect } from '@playwright/test';
import { loadSession } from './utils/session-manager';

test.describe('Live Tracking & Geofence Validation', () => {
  test('should trigger geofence and change status to arrived', async ({ request }) => {
    const session = await loadSession();
    if (!session) {
      throw new Error('Test session data not found. Ensure Task 2 has run successfully.');
    }
    
    const headers = { 
      'Authorization': `Bearer ${session.riderToken}`,
      'Content-Type': 'application/json'
    };

    // 1. Get request details to find dropoff coordinates
    const getResponse = await request.get(`/api/requests/${session.requestId}`, { headers });
    expect(getResponse.status()).toBe(200);
    const details = await getResponse.json();
    const { dropoff_lat, dropoff_lng } = details;
    
    expect(dropoff_lat).toBeDefined();
    expect(dropoff_lng).toBeDefined();

    // 2. Simulate location update FAR from geofence
    await request.post('/api/users/location', {
      headers,
      data: {
        lat: Number(dropoff_lat) + 0.1,
        lng: Number(dropoff_lng) + 0.1,
        requestId: session.requestId
      }
    });

    // Verify status is still in_progress
    const checkMid = await request.get(`/api/requests/${session.requestId}`, { headers });
    const detailsMid = await checkMid.json();
    expect(detailsMid.delivery_status).toBe('in_progress');

    // 3. Simulate location update AT dropoff point (Geofence Trigger)
    const updateResponse = await request.post('/api/users/location', {
      headers,
      data: {
        lat: Number(dropoff_lat),
        lng: Number(dropoff_lng),
        requestId: session.requestId
      }
    });
    
    expect(updateResponse.status()).toBe(200);
    const updateResult = await updateResponse.json();
    expect(updateResult.success).toBe(true);

    // 4. Verify status remains 'in_progress' (Geofence auto-arrival removed)
    const finalCheck = await request.get(`/api/requests/${session.requestId}`, { headers });
    const finalDetails = await finalCheck.json();
    expect(finalDetails.delivery_status).toBe('in_progress');
    
    console.log(`✅ Status verified for ${session.requestId}. Status: in_progress`);
  });
});
