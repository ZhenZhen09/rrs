import { test, expect, request as playwrightRequest } from '@playwright/test';
import { saveSession } from './utils/session-manager';

const WEB_BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001/api';

const PERSONNEL = { email: 'john.hr@company.com', password: 'john' };
const ADMIN = { email: 'admin@company.com', password: 'password' };
const RIDER = { 
  email: 'rider1@company.com', 
  password: 'rider1', 
  displayName: 'Mike Rider', 
  riderId: 'rider_001' 
};

async function login(page: Page, email: string, password: string, expectedHeading: RegExp) {
  await page.goto(WEB_BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/Email address/i).fill(email);
  await page.getByPlaceholder(/Password/i).fill(password);
  await page.getByRole('button', { name: /Login|Sign in/i }).click();
  await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible({ timeout: 20000 });
}

async function chooseMapLocation(page: any, triggerText: string, query: string) {
  await page.getByRole('button', { name: new RegExp(triggerText, 'i') }).click();
  const searchInput = page.getByPlaceholder('Search location or business...');
  await expect(searchInput).toBeVisible({ timeout: 20000 });
  await searchInput.fill(query);
  const firstSuggestion = page.locator('button').filter({ hasText: query }).first();
  await expect(firstSuggestion).toBeVisible({ timeout: 20000 });
  await firstSuggestion.click();
  await page.getByRole('button', { name: /Confirm Selection|Confirm/ }).click();
}

async function setSelectValue(page: any, triggerText: string | RegExp, optionText: string) {
  await page.getByRole('button', { name: triggerText }).click();
  await page.getByRole('option', { name: optionText }).click();
}

async function fetchApiToken(email: string, password: string): Promise<string> {
  const api = await playwrightRequest.newContext();
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  await api.dispose();
  return data.token;
}

test.describe('Hybrid E2E Lifecycle', () => {
  test('should complete the full lifecycle from Personnel to Rider API', async ({ page, request }) => {
    let requestId: string;
    let riderToken: string;
    const deliveryDate = new Date().toISOString().slice(0, 10);

    await test.step('Personnel Phase: Create Request', async () => {
      await login(page, PERSONNEL.email, PERSONNEL.password, /Delivery Center/i);
      
      await page.getByRole('button', { name: 'New Delivery Request' }).click();
      await expect(page.getByRole('heading', { name: /Create New Request|Update Request/ })).toBeVisible();

      await page.getByPlaceholder('Assign to your name or specific person').fill('E2E Test Submitter');
      await page.getByRole('combobox').first().click();
      await page.getByRole('option', { name: 'Delivery/Pickup' }).click();

      await setSelectValue(page, /Select Slot/, '08:00 - 09:00');
      await page.locator('input[type="date"]').fill(deliveryDate);

      await chooseMapLocation(page, 'Select pickup point', 'Toyota Pasong Tamo');
      await page.getByPlaceholder('Name at pickup point').fill('E2E Pickup Contact');
      await page.getByPlaceholder('+63 9xx xxx xxxx').first().fill('09170000001');

      await chooseMapLocation(page, 'Select destination point', 'RCBC Plaza Makati');
      await page.getByPlaceholder('Full name').fill('E2E Test Recipient');
      await page.getByPlaceholder('+63 9xx xxx xxxx').nth(1).fill('09170000002');
      await page.getByPlaceholder('e.g. Passbook update, FOR DEPOSIT, Sign fund transfer...').fill('E2E Test Instructions');

      // Intercept request to capture ID
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/requests') && response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: 'Confirm and Submit Request' }).click();
      await page.getByRole('button', { name: 'Yes, Submit' }).click();

      const response = await responsePromise;
      const responseBody = await response.json();
      requestId = responseBody.request_id || responseBody.id;
      expect(requestId).toBeDefined();
    });

    await test.step('Admin Phase: Approve and Assign', async () => {
      // Re-login as Admin
      await page.evaluate(() => localStorage.clear());
      await login(page, ADMIN.email, ADMIN.password, 'Dispatch Console');

      // Search for the request
      const search = page.getByPlaceholder('Search...');
      await search.fill('E2E Test Recipient');
      const card = page.locator('button, div').filter({ hasText: 'E2E Test Recipient' }).first();
      await expect(card).toBeVisible({ timeout: 20000 });
      await card.click();

      // Approve and Assign
      await page.getByPlaceholder('Explain cancellation, revision, or provide rider instructions...').fill('Approved via E2E Test');
      await page.locator('button').filter({ hasText: RIDER.displayName }).first().click();
      await page.getByRole('button', { name: new RegExp(`Assign to ${RIDER.displayName.split(' ')[0]}`, 'i') }).click();

      // Verify status change via UI or wait a bit
      await expect(page.getByText(/Approved|Assigned/i).first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Rider API Phase: Start Delivery', async () => {
      riderToken = await fetchApiToken(RIDER.email, RIDER.password);
      
      const response = await request.put(`${API_BASE_URL}/requests/${requestId}/status`, {
        data: { 
          status: 'in_progress', 
          remark: 'Starting E2E delivery' 
        },
        headers: { 
          'Authorization': `Bearer ${riderToken}` 
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.delivery_status || body.status).toBe('in_progress');
    });

    await test.step('Data Persistence: Save Session', async () => {
      saveSession({ requestId, riderToken });
      console.log(`Saved session: requestId=${requestId}`);
    });

    await test.step('Mobile UI Verification', async () => {
      const { execSync } = require('child_process');
      const { loadSession } = require('./utils/session-manager');
      const session = loadSession();
      
      if (!session || !session.requestId) {
        throw new Error('Test session data not found for Maestro verification.');
      }
      
      console.log(`Starting Maestro verification for ${session.requestId}...`);
      
      try {
        // Execute Maestro command
        // -e REQUEST_ID passes the ID to the Maestro flow
        execSync(`maestro test .maestro/e2e-visibility-check.yaml -e REQUEST_ID=${session.requestId}`, {
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log('✅ Maestro verification passed');
      } catch (error) {
        console.error('❌ Maestro verification failed');
        throw error;
      }
    });
  });
});
