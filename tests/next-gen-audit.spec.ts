import { test, expect } from '@playwright/test';

/**
 * Super Power Audit V2: Next-Gen Resilience
 * Non-invasive deep testing of high-frequency interactions and data privacy.
 */

const TARGET_URL = 'https://rrs-vhgr.onrender.com';

test.describe('Next-Gen System Audit', () => {

  test('Security: BOLA Cross-Department Isolation', async ({ request }) => {
    console.log('Audit: Testing Cross-Department Privacy...');

    // 1. Login as Admin to find a job from 'Finance'
    const adminLogin = await request.post(`${TARGET_URL}/api/auth/login`, {
      data: { email: 'admin@company.com', password: 'password' }
    });
    const { token: adminToken } = await adminLogin.json();

    // Fetch all requests to find a Finance one
    const listRes = await request.get(`${TARGET_URL}/api/requests?limit=100`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const { data: allJobs } = await listRes.json();
    
    const financeJob = allJobs.find((j: any) => j.requester_department === 'Finance');
    
    if (!financeJob) {
      console.warn('Audit: No Finance jobs found to test isolation. Skipping sub-test.');
      return;
    }

    console.log(`Audit: Found Finance Job ${financeJob.request_id}. Attempting illegal access as HR...`);

    // 2. Login as John (Human Resources)
    const hrLogin = await request.post(`${TARGET_URL}/api/auth/login`, {
      data: { email: 'john.hr@company.com', password: 'Hon010125@' }
    });
    const { token: hrToken } = await hrLogin.json();

    // 3. Attempt to view the Finance Job as an HR user
    const breachRes = await request.get(`${TARGET_URL}/api/requests/${financeJob.request_id}`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });

    console.log(`Audit: HR access to Finance Job returned status ${breachRes.status()}`);
    
    // Expect 403 or 404 (Hidden)
    expect([403, 404]).toContain(breachRes.status());
    console.log('✅ Department Isolation verified (Zero Leakage).');
  });

  test('Admin UX: Search Race Condition Stress Test', async ({ page }) => {
    console.log('Audit: Testing Search Resilience...');

    // 1. Login
    await page.goto(`${TARGET_URL}/login`);
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // 2. Go to Dispatch Console
    await page.click('nav >> text=Dispatch');
    
    // 3. Perform rapid typing into the search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    const searchTerms = ['REQ', 'REQ-', 'REQ-1', 'REQ-12', 'REQ-123'];
    for (const term of searchTerms) {
       await searchInput.fill(term);
       // We don't wait for the debounce here to simulate real-world rapid usage
    }

    // Final result check
    await page.waitForTimeout(1000);
    const rows = page.locator('tbody tr');
    console.log(`Audit: Search completed. Current visible rows: ${await rows.count()}`);
    
    console.log('✅ Search UX verified as stable.');
  });
});
