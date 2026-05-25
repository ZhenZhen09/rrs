import { test, expect } from '@playwright/test';

/**
 * Personnel Grace Period Audit
 * Verifies the 60-second cancellation enforcement.
 */

const TARGET_URL = 'https://rrs-vhgr.onrender.com';

test.describe('Personnel Lifecycle Audit', () => {
  
  test('Grace Period: 60s cancellation boundary', async ({ page, request }) => {
    console.log('Audit: Verifying Personnel cancellation rules...');

    // 1. Login
    await page.goto(`${TARGET_URL}/login`);
    await page.fill('input[type="email"]', 'john.hr@company.com');
    await page.fill('input[type="password"]', 'Hon010125@');
    await page.click('button[type="submit"]');

    // 2. Fetch a recent request ID via API for the user
    // (This is non-invasive as we just check existing data)
    const loginRes = await request.post(`${TARGET_URL}/api/auth/login`, {
      data: { email: 'john.hr@company.com', password: 'Hon010125@' }
    });
    const { token } = await loginRes.json();

    const listRes = await request.get(`${TARGET_URL}/api/requests?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const jobs = await listRes.json();
    const data = Array.isArray(jobs) ? jobs : jobs.data;

    if (data && data.length > 0) {
       const job = data[0];
       const createdAt = new Date(job.created_at).getTime();
       const now = Date.now();
       const ageSeconds = (now - createdAt) / 1000;
       
       console.log(`Audit: Found job ${job.request_id} created ${Math.round(ageSeconds)}s ago.`);

       if (ageSeconds > 60) {
          console.log('Audit: Attempting illegal cancellation of old job...');
          const cancelRes = await request.put(`${TARGET_URL}/api/requests/${job.request_id}/cancel`, {
            data: { remark: 'Audit Attempt' },
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          // Should be blocked by the 60s rule
          console.log(`Audit: Cancellation result status: ${cancelRes.status()}`);
          expect(cancelRes.status()).toBe(400);
          const errData = await cancelRes.json();
          expect(errData.error).toContain('cancellation window');
          console.log('✅ Personnel Grace Period verified (Block successful).');
       }
    } else {
       console.warn('Audit: No jobs found for personnel to test grace period.');
    }
  });
});
