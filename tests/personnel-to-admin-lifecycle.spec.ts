import { test, expect, type Page } from '@playwright/test';

const PERSONNEL = { email: 'john.hr@company.com', password: 'john' };
const ADMIN = { email: 'admin@company.com', password: 'password' };
const TEST_RIDER = { email: 'testrider@company.com', displayName: 'Test Rider' };

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for the URL to change to a dashboard/portal
  await page.waitForURL(/\/dashboard|portal/, { timeout: 15000 });
}

async function submitRequest(page: Page, recipientName: string) {
  await page.getByRole('button', { name: 'New Delivery Request' }).click();
  await page.getByPlaceholder('Assign to your name or specific person').fill('Test Requester');
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Delivery/Pickup' }).click();
  
  // Set date (today)
  const today = new Date().toISOString().split('T')[0];
  await page.locator('input[type="date"]').fill(today);
  
  // Map Pickers (Assuming auto-selection or simple click for mock environment)
  await page.getByRole('button', { name: /Select pickup point/i }).click();
  await page.locator('.leaflet-container').click();
  await page.getByRole('button', { name: /Confirm/i }).click();
  
  await page.getByRole('button', { name: /Select destination point/i }).click();
  await page.locator('.leaflet-container').click();
  await page.getByRole('button', { name: /Confirm/i }).click();

  await page.getByPlaceholder('Full name').fill(recipientName);
  await page.getByPlaceholder('e.g. Passbook update...').fill('Initial test instructions');
  
  await page.getByRole('button', { name: 'Confirm and Submit Request' }).click();
  await page.getByRole('button', { name: 'Yes, Submit' }).click();
}

test('Scenario A: Successful Approval and Assignment', async ({ browser, baseURL }) => {
  const personnelCtx = await browser.newContext();
  const personnelPage = await personnelCtx.newPage();
  const recipient = `Approval-Test-${Date.now()}`;

  // 1. Personnel Submits
  await login(personnelPage, PERSONNEL.email, PERSONNEL.password);
  await submitRequest(personnelPage, recipient);

  // 2. Admin Approves
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  
  await adminPage.getByPlaceholder('Search...').fill(recipient);
  await adminPage.locator('button, div').filter({ hasText: recipient }).first().click();
  
  await adminPage.locator('button').filter({ hasText: TEST_RIDER.displayName }).first().click();
  await adminPage.getByRole('button', { name: new RegExp(`Assign to ${TEST_RIDER.displayName}`, 'i') }).click();

  // 3. Verify
  await expect(personnelPage.locator('text=Approved')).toBeVisible();
  await expect(personnelPage.locator(`text=${TEST_RIDER.displayName}`)).toBeVisible();
  
  await personnelCtx.close();
  await adminCtx.close();
});
