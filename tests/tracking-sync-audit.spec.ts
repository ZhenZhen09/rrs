import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import path from 'path';

/**
 * End-to-End Tracking Sync Audit
 * Proves that mobile location pings reach the web map in real-time.
 */

const TARGET_URL = 'https://rrs-vhgr.onrender.com';

test.describe('Real-Time Tracking Sync Audit', () => {

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

    // 4. Trigger the Mobile Simulation in the background
    console.log('🚀 Launching Mobile Emitter Simulation...');
    const simScriptPath = path.join(process.cwd(), 'server', 'scripts', 'simulate-rider-movement.cjs');
    exec(`node ${simScriptPath}`);

    // 5. Assertion: The browser must see at least one socket update
    const consoleMsg = await locationUpdatePromise;
    console.log(`✅ Audit Success: Browser received real-time packet: ${consoleMsg.text()}`);
    
    // 6. Verify UI: Check if at least one marker is visible
    const marker = page.locator('.custom-rider-icon');
    await expect(marker.first()).toBeVisible();
    
    console.log('⭐ End-to-End Tracking Sync verified.');
  });
});
