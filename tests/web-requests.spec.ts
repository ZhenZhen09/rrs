import { test, expect } from '@playwright/test';

test.describe('Personnel Request Visibility', () => {
  test('Rider can see Today and Tomorrow requests', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'rider1@company.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/.*rider\/dashboard/);

    // Check Today Tab
    await page.click('button:has-text("Today")');
    await expect(page.locator('text=Today Request')).toBeVisible();

    // Check Tomorrow Tab
    await page.click('button:has-text("Tomorrow")');
    await expect(page.locator('text=Tomorrow Request')).toBeVisible();

    // Check History Tab (Overdue might be here or not shown depending on logic)
    await page.click('button:has-text("History")');
    // Overdue is yesterday, but if it's 'assigned' it might not show in history if history only shows completed/failed
    // Based on RiderDashboard.tsx:
    // const historyDeliveries = myDeliveries.filter(req => req.delivery_status === 'completed' || req.delivery_status === 'failed');
    // So 'assigned' overdue won't show in History.
  });
});
