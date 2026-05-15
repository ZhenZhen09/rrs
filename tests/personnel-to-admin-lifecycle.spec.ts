import { test, expect, type Page } from '@playwright/test';

const WEB_BASE_URL = 'http://localhost:5173';
const PERSONNEL = { email: 'john.hr@company.com', password: 'john' };
const ADMIN = { email: 'admin@company.com', password: 'password' };
const TEST_RIDER = { email: 'testrider@company.com', displayName: 'Test Rider' };

async function login(page: Page, email: string, password: string) {
  await page.goto(`${WEB_BASE_URL}/login`);
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
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
