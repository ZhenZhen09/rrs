import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import path from 'path';

const TARGET_URL = 'http://localhost:5173';

test.describe('Local Real-Time Tracking Sync Audit', () => {

  test('Sync: Web map should receive real-time location updates', async ({ page }) => {
    // 1. Setup: Login as Admin
    await page.goto(`${TARGET_URL}/login`);
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to Rider Map
    await page.waitForURL(/.*dashboard|dispatch/);
    await page.goto(`${TARGET_URL}/admin/map`);
    
    console.log('✅ Web Admin on Map page. Waiting for sync bridge...');

    // 3. Listen for the "Location Received" log in the browser console
    const locationUpdatePromise = page.waitForEvent('console', {
      predicate: (msg) => msg.text().includes('RealTime: Location update received'),
      timeout: 30000
    });

    // 4. Trigger the Mobile Simulation
    const simScriptPath = path.join(process.cwd(), 'server', 'scripts', 'simulate-rider-movement-local.cjs');
    exec(`node ${simScriptPath}`);

    // 5. Assertion
    const consoleMsg = await locationUpdatePromise;
    expect(consoleMsg.text()).toContain('RealTime: Location update received');
    
    console.log('⭐ Local Tracking Sync verified.');
  });
});
