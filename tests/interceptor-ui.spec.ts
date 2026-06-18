import { test, expect } from '@playwright/test';

const WEB_BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN = { email: 'admin@company.com', password: 'password' };

test.describe('Interceptor UI Verification', () => {
  test('should show correct ranking and NEW tags in Interceptor modal', async ({ page }) => {
    // 1. Mock API Responses
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      console.log(`Mocking URL: ${url}`);
      
      if (url.includes('/api/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            id: 'admin_001', role: 'admin', name: 'Admin', email: 'admin@company.com',
            token: 'mock-token', refreshToken: 'mock-refresh' 
          })
        });
      } else if (url.includes('/api/users/riders/live')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { 
              id: 'rider_001', name: 'Mike Rider', role: 'rider', is_on_duty: true, is_online: true, 
              attendance_status: 'present', current_lat: 1.1, current_lng: 1.1, user_status: 'active' 
            }
          ])
        });
      } else if (url.includes('/api/requests/counts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ pending: 1, active: 2, done: 0 })
        });
      } else if (url.includes('/api/requests')) {
        // Flat list of requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              request_id: 'req_pending_1', requester_id: 'p1', requester_name: 'John', recipient_name: 'Recipient New',
              pickup_address: 'Pickup New', dropoff_address: 'Dropoff New', pickup_location: { lat: 1, lng: 1 }, dropoff_location: { lat: 2, lng: 2 },
              delivery_date: new Date().toISOString().slice(0, 10), time_window: '11:00 - 12:00', status: 'pending', urgency_level: 'High', delivery_status: 'pending', request_type: 'Delivery'
            },
            {
              request_id: 'req_active_1', assigned_rider_id: 'rider_001', assigned_rider_name: 'Mike Rider', status: 'approved',
              delivery_status: 'assigned', queue_order: 1, pickup_address: 'Pickup A', dropoff_address: 'Dropoff A', pickup_location: { lat: 1, lng: 1 }, dropoff_location: { lat: 2, lng: 2 },
              delivery_date: new Date().toISOString().slice(0, 10), time_window: '08:00 - 09:00'
            },
            {
              request_id: 'req_active_2', assigned_rider_id: 'rider_001', assigned_rider_name: 'Mike Rider', status: 'approved',
              delivery_status: 'in_progress', queue_order: 2, pickup_address: 'Pickup B', dropoff_address: 'Dropoff B', pickup_location: { lat: 1, lng: 1 }, dropoff_location: { lat: 2, lng: 2 },
              delivery_date: new Date().toISOString().slice(0, 10), time_window: '09:00 - 10:00'
            }
          ])
        });
      } else if (url.includes('/api/notifications')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    // 2. Login as Admin
    await page.goto(WEB_BASE_URL);
    await page.getByPlaceholder(/Email address/i).fill(ADMIN.email);
    await page.getByPlaceholder(/Password/i).fill(ADMIN.password);
    await page.getByRole('button', { name: /Login|Sign in/i }).click();
    
    // Debug: Page Title and URL
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());

    // Wait for Dispatch Console - try text instead of heading
    await expect(page.locator('text=Dispatch Console').first()).toBeVisible({ timeout: 20000 });

    // 2. Locate and Select the Pending task 'req_pending_1'
    // UI shows #ENDING_1 (slice -8) in list
    const card = page.locator('div').filter({ hasText: 'ENDING_1' }).last();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click({ force: true });

    // Verify selection (Header should show the ID - slice -6)
    await expect(page.locator('h2').filter({ hasText: 'DING_1' })).toBeVisible({ timeout: 15000 });

    // 3. Select Rider 'Mike Rider' (rider_001) in the side panel
    // Debug: Right Panel Content after selection
    console.log('Right Panel Inner Text after click:', await page.locator('main').innerText());

    // Debug: List all riders found
    const allRiders = await page.locator('p').allInnerTexts();
    console.log('All P tags in list:', allRiders);

    // Find the rider card and click it
    const riderCard = page.locator('text=Mike Rider').first();
    await expect(riderCard).toBeVisible({ timeout: 10000 });
    await riderCard.click();

    // 4. Click 'Assign to Mike' button
    const assignButton = page.locator('button').filter({ hasText: /Assign to Mike/i });
    await expect(assignButton).toBeVisible({ timeout: 5000 });
    await assignButton.click();

    // 5. Verify Interceptor Modal opens
    const modalHeader = page.locator('h3', { hasText: 'The Interceptor' });
    await expect(modalHeader).toBeVisible();

    const interceptorModal = page.locator('div[role="dialog"]');
    await expect(interceptorModal).toBeVisible({ timeout: 10000 });
    
    // a. Check for Rank Badges (1, 2, 3)
    // We expect 3 items (2 active + 1 new)
    for (let i = 1; i <= 3; i++) {
      const badge = interceptorModal.locator(`div.absolute.-top-3.-left-3`).filter({ hasText: new RegExp(`^${i}$`) });
      await expect(badge).toBeVisible({ timeout: 10000 });
    }

    // b. Check for "NEW" Badge on the pending task
    const newBadge = interceptorModal.locator('span:text-is("NEW")');
    await expect(newBadge).toBeVisible();
    await expect(newBadge).toHaveClass(/animate-pulse/);

    // c. Check for "IN PROGRESS" task (Rank #1)
    const inProgressBadge = interceptorModal.locator('span:text-is("IN PROGRESS")');
    await expect(inProgressBadge).toBeVisible();

    // 6. Verify Interleaving (Sorting)
    // The items are either direct children of the scroll area or inside the Reorder group
    const modalCards = interceptorModal.locator('div.rounded-xl.border-2');
    const count = await modalCards.count();
    console.log('Items found in modal (by class):', count);
    
    // Fallback: Check for ID fragments anywhere in the modal
    await expect(interceptorModal.locator('text=TIVE_2')).toBeVisible();
    await expect(interceptorModal.locator('text=DING_1')).toBeVisible();
    await expect(interceptorModal.locator('text=TIVE_1')).toBeVisible();

    const firstItemText = await modalCards.nth(0).innerText();
    expect(firstItemText).toContain('TIVE_2'); 
    
    const secondItemText = await modalCards.nth(1).innerText();
    expect(secondItemText).toContain('DING_1'); 
    
    const thirdItemText = await modalCards.nth(2).innerText();
    expect(thirdItemText).toContain('TIVE_1'); 
    
    console.log('UI Verification Passed: Rank badges, NEW tags, and Smart-Slotting are verified.');
  });
});
