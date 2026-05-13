import { test, expect, request as playwrightRequest, type Browser, type Page, type APIRequestContext, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const WEB_BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001/api';
const ARTIFACT_DIR = path.join(process.cwd(), 'test-results');
const ARTIFACT_PATH = path.join(ARTIFACT_DIR, 'web-mobile-workflow.json');

const PERSONNEL = { email: 'john.hr@company.com', password: 'john' };
const ADMIN = { email: 'admin@company.com', password: 'password' };
const RIDER = { email: 'rider1@company.com', backendPassword: 'rider1', displayName: 'Mike Rider', riderId: 'rider_001' };

type ScenarioRequest = {
  label: string;
  recipientName: string;
  recipientContact: string;
  pickupQuery: string;
  dropoffQuery: string;
  timeWindow: string;
  initialInstructions: string;
  revisedInstructions?: string;
  adminRemark?: string;
  requestId?: string;
  finalStatus?: string;
  finalDeliveryStatus?: string;
  assignedRiderName?: string | null;
};

type ScenarioArtifact = {
  executedAt: string;
  webBaseUrl: string;
  apiBaseUrl: string;
  deliveryDate: string;
  requests: ScenarioRequest[];
};

const scenarioRequests: ScenarioRequest[] = [
  {
    label: 'A',
    recipientName: 'PW Mike Flow Recipient A',
    recipientContact: '09170000001',
    pickupQuery: 'Toyota Pasong Tamo',
    dropoffQuery: 'RCBC Plaza Makati',
    timeWindow: '08:00 - 09:00',
    initialInstructions: 'PW scenario A initial instructions.',
    adminRemark: 'Approved via Playwright scenario A.',
  },
  {
    label: 'B',
    recipientName: 'PW Mike Flow Recipient B',
    recipientContact: '09170000002',
    pickupQuery: 'One Ayala Makati',
    dropoffQuery: 'Ayala Triangle Gardens',
    timeWindow: '09:00 - 10:00',
    initialInstructions: 'PW scenario B initial instructions.',
    adminRemark: 'Approved via Playwright scenario B.',
  },
  {
    label: 'C',
    recipientName: 'PW Mike Flow Recipient C',
    recipientContact: '09170000003',
    pickupQuery: 'Glorietta 4 Makati',
    dropoffQuery: 'Greenbelt 5 Makati',
    timeWindow: '10:00 - 11:00',
    initialInstructions: 'PW scenario C initial instructions.',
    revisedInstructions: 'PW scenario C revised instructions after admin feedback.',
    adminRemark: 'Please clarify the handling note before assignment.',
  },
];

async function login(page: Page, email: string, password: string, expectedHeading: RegExp) {
  await page.goto(WEB_BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible({ timeout: 20000 });
}

async function setSelectValue(page: Page, triggerText: string | RegExp, optionText: string) {
  await page.getByRole('button', { name: triggerText }).click();
  await page.getByRole('option', { name: optionText }).click();
}

async function chooseMapLocation(page: Page, triggerText: string, query: string) {
  await page.getByRole('button', { name: new RegExp(triggerText, 'i') }).click();
  const searchInput = page.getByPlaceholder('Search location or business...');
  await expect(searchInput).toBeVisible({ timeout: 20000 });
  await searchInput.fill(query);
  const firstSuggestion = page.locator('button').filter({ hasText: query }).first();
  await expect(firstSuggestion).toBeVisible({ timeout: 20000 });
  await firstSuggestion.click();
  await page.getByRole('button', { name: /Confirm Selection|Confirm/ }).click();
}

async function submitPersonnelRequest(page: Page, requestData: ScenarioRequest, deliveryDate: string) {
  await page.getByRole('button', { name: 'New Delivery Request' }).click();
  await expect(page.getByRole('heading', { name: /Create New Request|Update Request/ })).toBeVisible();

  await page.getByPlaceholder('Assign to your name or specific person').fill(`Playwright ${requestData.label}`);
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Delivery/Pickup' }).click();

  await setSelectValue(page, /Select Slot|08:00 - 09:00|09:00 - 10:00|10:00 - 11:00/, requestData.timeWindow);
  await page.locator('input[type="date"]').fill(deliveryDate);

  await chooseMapLocation(page, 'Select pickup point', requestData.pickupQuery);
  await page.getByPlaceholder('Name at pickup point').fill(`Pickup ${requestData.label}`);
  await page.getByPlaceholder('+63 9xx xxx xxxx').first().fill(`0918${requestData.label.charCodeAt(0)}000001`);

  await chooseMapLocation(page, 'Select destination point', requestData.dropoffQuery);
  await page.getByPlaceholder('Full name').fill(requestData.recipientName);
  await page.getByPlaceholder('+63 9xx xxx xxxx').nth(1).fill(requestData.recipientContact);
  await page.getByPlaceholder('e.g. Passbook update, FOR DEPOSIT, Sign fund transfer...').fill(requestData.initialInstructions);

  await page.getByRole('button', { name: 'Confirm and Submit Request' }).click();
  await page.getByRole('button', { name: 'Yes, Submit' }).click();
  await expect(page.getByText(/Processing|Pending Review|Approved|No active deliveries/i)).toBeVisible({ timeout: 20000 });
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

async function fetchApiUser(email: string, password: string) {
  const api = await playwrightRequest.newContext();
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  await api.dispose();
  return data as { token: string; refreshToken: string; id: string; email: string; role: string; department?: string; name: string };
}

async function createAuthenticatedContext(browser: Browser, user: { email: string; password: string }) {
  const sessionUser = await fetchApiUser(user.email, user.password);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${sessionUser.token}`,
    },
  });

  await context.addInitScript((currentUser) => {
    window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }, sessionUser);

  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const backendUrl = `${API_BASE_URL}${url.pathname.replace(/^\/api/, '')}${url.search}`;
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;
    delete headers.cookie;
    delete headers['content-length'];

    const response = await api.fetch(backendUrl, {
      method: request.method(),
      headers,
      data: request.postDataBuffer() ?? undefined,
    });

    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: await response.body(),
    });
  });

  return { context, api, sessionUser };
}

async function getRequestsByRecipients(token: string, recipients: string[]) {
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
  const response = await api.get(`${API_BASE_URL}/requests?limit=100`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : payload.data || [];
  await api.dispose();

  return recipients.map((recipient) => {
    const match = items.find((item: any) => item.recipient_name === recipient);
    expect(match, `Missing request for recipient ${recipient}`).toBeTruthy();
    return match;
  });
}

async function waitForRequests(token: string, requests: ScenarioRequest[], predicate: (item: any) => boolean) {
  await expect
    .poll(async () => {
      const matches = await getRequestsByRecipients(token, requests.map((item) => item.recipientName));
      return matches.every(predicate);
    }, {
      timeout: 30000,
      intervals: [1000, 1500, 2000],
    })
    .toBeTruthy();
}

async function searchAndOpenAdminRequest(page: Page, recipientName: string) {
  const search = page.getByPlaceholder('Search...');
  await search.fill(recipientName);
  const card = page.locator('button, div').filter({ hasText: recipientName }).first();
  await expect(card).toBeVisible({ timeout: 20000 });
  await card.click();
  await expect(page.getByText(recipientName)).toBeVisible({ timeout: 20000 });
}

async function assignSelectedRequestToMike(page: Page, remark?: string) {
  const note = page.getByPlaceholder('Explain cancellation, revision, or provide rider instructions...');
  if (remark) {
    await note.fill(remark);
  }

  await page.locator('button').filter({ hasText: RIDER.displayName }).first().click();
  await page.getByRole('button', { name: /Assign to Mike/i }).click();
}

async function returnSelectedRequestForRevision(page: Page, remark: string) {
  const note = page.getByPlaceholder('Explain cancellation, revision, or provide rider instructions...');
  await note.fill(remark);
  await page.getByRole('button', { name: 'Request Revision' }).click();
}

async function resubmitRevision(page: Page, revisedInstructions: string) {
  await page.getByRole('tab', { name: /Action Required/i }).click();
  await page.getByRole('button', { name: 'Edit & Resubmit' }).click();
  await expect(page.getByRole('heading', { name: 'Update Request' })).toBeVisible({ timeout: 20000 });

  const instructions = page.getByPlaceholder('e.g. Passbook update, FOR DEPOSIT, Sign fund transfer...');
  await instructions.fill(revisedInstructions);
  await page.getByRole('button', { name: 'Confirm and Submit Request' }).click();
  await page.getByRole('button', { name: 'Yes, Submit' }).click();
}

function writeArtifact(artifact: ScenarioArtifact) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2), 'utf8');
}

test('personnel to admin to rider cross-app workflow', async ({ browser }) => {
  const deliveryDate = new Date().toISOString().slice(0, 10);
  const adminToken = await fetchApiToken(ADMIN.email, ADMIN.password);

  const { context: personnelContext } = await createAuthenticatedContext(browser, PERSONNEL);
  const personnelPage = await personnelContext.newPage();
  await personnelPage.goto(`${WEB_BASE_URL}/personnel/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(personnelPage.getByRole('heading', { name: /Delivery Center/i })).toBeVisible({ timeout: 20000 });

  for (const requestData of scenarioRequests) {
    await submitPersonnelRequest(personnelPage, requestData, deliveryDate);
  }

  await waitForRequests(adminToken, scenarioRequests, (item) => item.status === 'submitted_waiting' || item.status === 'pending');
  const createdRequests = await getRequestsByRecipients(adminToken, scenarioRequests.map((item) => item.recipientName));

  createdRequests.forEach((item: any, index: number) => {
    scenarioRequests[index].requestId = item.request_id;
  });

  const { context: adminContext } = await createAuthenticatedContext(browser, ADMIN);
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${WEB_BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: /Dispatch Console/i })).toBeVisible({ timeout: 20000 });

  await searchAndOpenAdminRequest(adminPage, scenarioRequests[0].recipientName);
  await assignSelectedRequestToMike(adminPage, scenarioRequests[0].adminRemark);

  await searchAndOpenAdminRequest(adminPage, scenarioRequests[1].recipientName);
  await assignSelectedRequestToMike(adminPage, scenarioRequests[1].adminRemark);

  await searchAndOpenAdminRequest(adminPage, scenarioRequests[2].recipientName);
  await returnSelectedRequestForRevision(adminPage, scenarioRequests[2].adminRemark!);

  await waitForRequests(adminToken, scenarioRequests.slice(0, 2), (item) => item.status === 'approved' && item.assigned_rider_id === RIDER.riderId);
  await waitForRequests(adminToken, [scenarioRequests[2]], (item) => item.status === 'returned_for_revision');

  await resubmitRevision(personnelPage, scenarioRequests[2].revisedInstructions!);
  await waitForRequests(adminToken, [scenarioRequests[2]], (item) => item.status === 'pending');

  await searchAndOpenAdminRequest(adminPage, scenarioRequests[2].recipientName);
  await assignSelectedRequestToMike(adminPage, 'Approved after personnel revision. Assigned to Mike Rider.');

  await waitForRequests(adminToken, scenarioRequests, (item) => item.status === 'approved' && item.assigned_rider_id === RIDER.riderId);

  const finalRequests = await getRequestsByRecipients(adminToken, scenarioRequests.map((item) => item.recipientName));
  finalRequests.forEach((item: any, index: number) => {
    scenarioRequests[index].requestId = item.request_id;
    scenarioRequests[index].finalStatus = item.status;
    scenarioRequests[index].finalDeliveryStatus = item.delivery_status;
    scenarioRequests[index].assignedRiderName = item.assigned_rider_name;
  });

  writeArtifact({
    executedAt: new Date().toISOString(),
    webBaseUrl: WEB_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    deliveryDate,
    requests: scenarioRequests,
  });

  expect(finalRequests).toHaveLength(3);
  finalRequests.forEach((item: any) => {
    expect(item.status).toBe('approved');
    expect(item.assigned_rider_id).toBe(RIDER.riderId);
    expect(item.assigned_rider_name).toBe(RIDER.displayName);
    expect(item.delivery_status).toBe('assigned');
  });

  await personnelContext.close();
  await adminContext.close();
});
