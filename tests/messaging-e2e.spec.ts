import { test, expect, request as playwrightRequest, type Page, type APIRequestContext } from '@playwright/test';
import { io } from 'socket.io-client';
import type { ConversationMessage, ConversationSummary } from '../src/app/types/messaging';

// All cases share one dedicated assigned request; concurrent readers would invalidate unread assertions.
test.describe.configure({ mode: 'serial' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001/api';
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || '',
  password: process.env.E2E_ADMIN_PASSWORD || '',
};
const RIDER = {
  email: process.env.E2E_RIDER_EMAIL || '',
  password: process.env.E2E_RIDER_PASSWORD,
};

async function login(email: string, password: string) {
  const api = await playwrightRequest.newContext();
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
    headers: { 'x-client-type': 'mobile' },
  });
  expect(response.ok()).toBeTruthy();
  const session = await response.json() as { token: string; id: string; role: string };
  await api.dispose();
  return session;
}

test.describe('admin-rider messaging lifecycle', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(() => {
    for (const name of ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_RIDER_EMAIL', 'E2E_RIDER_PASSWORD']) {
      expect(process.env[name], `Dedicated development fixture required: set ${name}`).toBeTruthy();
    }
  });
  test('exchanges messages and synchronizes unread/read state', async () => {
    const admin = await login(ADMIN.email, ADMIN.password);
    const rider = await login(RIDER.email, RIDER.password!);
    const adminApi = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${admin.token}` } });
    const riderApi = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${rider.token}` } });

    try {
      const requestsResponse = await adminApi.get(`${API_BASE_URL}/requests?limit=100`);
      expect(requestsResponse.ok()).toBeTruthy();
      const requestPayload = await requestsResponse.json();
      const requests = Array.isArray(requestPayload) ? requestPayload : requestPayload.data || [];
      const assignedRequest = requests.find((item: any) => String(item.assigned_rider_id) === String(rider.id));
      expect(assignedRequest, 'An assigned rider request fixture is required for messaging E2E').toBeTruthy();

      const requestId = assignedRequest.request_id;
      const adminConversationResponse = await adminApi.get(`${API_BASE_URL}/requests/${requestId}/conversation`);
      const riderConversationResponse = await riderApi.get(`${API_BASE_URL}/requests/${requestId}/conversation`);
      expect(adminConversationResponse.ok()).toBeTruthy();
      expect(riderConversationResponse.ok()).toBeTruthy();

      const adminConversation = await adminConversationResponse.json();
      const riderConversation = await riderConversationResponse.json();
      expect(riderConversation.id).toBe(adminConversation.id);

      const adminClientMessageId = crypto.randomUUID();
      const riderClientMessageId = crypto.randomUUID();
      const adminSend = await adminApi.post(`${API_BASE_URL}/conversations/${adminConversation.id}/messages`, {
        data: { clientMessageId: adminClientMessageId, body: 'E2E dispatch update' },
      });
      expect(adminSend.status()).toBe(201);

      const riderInboxAfterAdmin = await riderApi.get(`${API_BASE_URL}/conversations?limit=100`);
      expect(riderInboxAfterAdmin.ok()).toBeTruthy();
      const riderInbox = await riderInboxAfterAdmin.json();
      const riderSummary = riderInbox.conversations.find((item: any) => item.id === riderConversation.id);
      expect(riderSummary.lastMessage.body).toBe('E2E dispatch update');
      expect(riderSummary.unreadCount).toBeGreaterThan(0);

      const riderSend = await riderApi.post(`${API_BASE_URL}/conversations/${riderConversation.id}/messages`, {
        data: { clientMessageId: riderClientMessageId, body: 'E2E rider reply' },
      });
      expect(riderSend.status()).toBe(201);

      const adminMessagesResponse = await adminApi.get(`${API_BASE_URL}/conversations/${adminConversation.id}/messages?limit=100`);
      expect(adminMessagesResponse.ok()).toBeTruthy();
      const adminMessages = await adminMessagesResponse.json();
      expect(adminMessages.messages.map((message: any) => message.body)).toEqual(
        expect.arrayContaining(['E2E dispatch update', 'E2E rider reply']),
      );

      const adminInboxAfterReply = await adminApi.get(`${API_BASE_URL}/conversations?limit=100`);
      const adminInbox = await adminInboxAfterReply.json();
      const adminSummary = adminInbox.conversations.find((item: any) => item.id === adminConversation.id);
      expect(adminSummary.unreadCount).toBeGreaterThan(0);

      expect((await adminApi.put(`${API_BASE_URL}/conversations/${adminConversation.id}/read`)).ok()).toBeTruthy();
      expect((await riderApi.put(`${API_BASE_URL}/conversations/${riderConversation.id}/read`)).ok()).toBeTruthy();

      const finalAdminInbox = await adminApi.get(`${API_BASE_URL}/conversations?limit=100`);
      const finalRiderInbox = await riderApi.get(`${API_BASE_URL}/conversations?limit=100`);
      const finalAdminSummary = (await finalAdminInbox.json()).conversations.find((item: any) => item.id === adminConversation.id);
      const finalRiderSummary = (await finalRiderInbox.json()).conversations.find((item: any) => item.id === riderConversation.id);
      expect(finalAdminSummary.unreadCount).toBe(0);
      expect(finalRiderSummary.unreadCount).toBe(0);
    } finally {
      await adminApi.dispose();
      await riderApi.dispose();
    }
  });
});

async function fixture(run: (value: {
  adminApi: APIRequestContext; riderApi: APIRequestContext;
  conversation: ConversationSummary; rider: Awaited<ReturnType<typeof login>>;
}) => Promise<void>) {
  for (const name of ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_RIDER_EMAIL', 'E2E_RIDER_PASSWORD']) {
    expect(process.env[name], `Dedicated development fixture required: set ${name}`).toBeTruthy();
  }
  const admin = await login(ADMIN.email, ADMIN.password);
  const rider = await login(RIDER.email, RIDER.password!);
  const adminApi = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${admin.token}` } });
  const riderApi = await playwrightRequest.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${rider.token}` } });
  try {
    const response = await adminApi.get(`${API_BASE_URL}/requests?limit=100`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const requests = Array.isArray(payload) ? payload : payload.data || [];
    const assigned = requests.find((item: { assigned_rider_id: string }) => String(item.assigned_rider_id) === String(rider.id));
    expect(assigned, 'Dedicated rider must have an assigned request').toBeTruthy();
    const result = await adminApi.get(`${API_BASE_URL}/requests/${assigned.request_id}/conversation`);
    expect(result.ok()).toBeTruthy();
    const conversation = await result.json() as ConversationSummary;
    expect(conversation.status, 'Fixture conversation must be open').toBe('open');
    await run({ adminApi, riderApi, conversation, rider });
  } finally {
    await adminApi.dispose();
    await riderApi.dispose();
  }
}

function monitor(page: Page, conversationId: string) {
  const calls: string[] = [];
  const limited: string[] = [];
  const receipts: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path === `/api/conversations/${conversationId}/messages` || path === `/api/conversations/${conversationId}/read`) {
      calls.push(`${request.method()} ${path}`);
    }
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (response.status() === 429 && url.pathname.startsWith('/api/')) limited.push(response.url());
    // Socket.IO also delivers receipts through Engine.IO HTTP polling before upgrade or as fallback.
    if (url.pathname.startsWith('/socket.io/') && url.searchParams.get('transport') === 'polling') {
      void response.text().then(packet => {
        if (packet.includes('conversation-read')) receipts.push(packet);
      }).catch(() => { /* Aborted polling responses contain no delivered packet. */ });
    }
  });
  page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
    const packet = String(payload);
    if (packet.includes('conversation-read')) receipts.push(packet);
  }));
  return { calls, limited, receipts };
}

async function openInbox(page: Page, conversation: ConversationSummary, narrow = false) {
  await page.goto('/');
  await page.getByLabel('Email address', { exact: true }).fill(ADMIN.email);
  await page.locator('#login-password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  if (narrow) await page.getByRole('button', { name: 'Open admin navigation' }).click();
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh inbox', exact: true }).waitFor();
  // The summary body uniquely identifies the dedicated fixture, even with several threads for one rider.
  await page.getByRole('button').filter({ has: page.getByText(conversation.lastMessage!.body, { exact: true }) }).click();
  await page.getByLabel('Message to rider').waitFor();
}

async function sendRider(riderApi: APIRequestContext, conversationId: string, body: string) {
  const response = await riderApi.post(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    data: { clientMessageId: crypto.randomUUID(), body },
  });
  expect(response.status()).toBe(201);
  return await response.json() as ConversationMessage;
}

test.describe('mounted admin messaging acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test('delivers both directions once and generates zero thread requests during 30 idle seconds', async ({ page }, testInfo) => {
    await fixture(async ({ riderApi, conversation, rider }) => {
      const seed = await sendRider(riderApi, conversation.id, `Fixture ${crypto.randomUUID()}`);
      conversation.lastMessage = seed;
      const traffic = monitor(page, conversation.id);
      const riderSocket = io(API_BASE_URL.replace(/\/api\/?$/, ''), {
        auth: { token: rider.token }, autoConnect: false, reconnection: false, transports: ['websocket'], timeout: 5000,
      });
      const received: ConversationMessage[] = [];
      riderSocket.on('conversation-message', event => received.push(event.message));
      try {
        await new Promise<void>((resolve, reject) => {
          riderSocket.once('connect', () => { riderSocket.emit('join', rider.id); resolve(); });
          riderSocket.once('connect_error', reject);
          riderSocket.connect();
        });
        await openInbox(page, conversation);
        const thread = page.locator('section [aria-live="polite"]');
        await expect(thread.getByText(seed.body, { exact: true })).toBeVisible();
        const adminBody = `Admin ${crypto.randomUUID()}`;
        await page.getByLabel('Message to rider').fill(adminBody);
        await page.getByRole('button', { name: 'Send message', exact: true }).click();
        await expect.poll(() => received.filter(item => item.body === adminBody).length).toBe(1);
        await expect(thread.getByText(adminBody, { exact: true })).toHaveCount(1);
        const historyCalls = () => traffic.calls.filter(call => call.startsWith('GET ')).length;
        const historyBaseline = historyCalls();
        const reply = await sendRider(riderApi, conversation.id, `Realtime reply ${crypto.randomUUID()}`);
        await expect(thread.getByText(reply.body, { exact: true })).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1500);
        expect(historyCalls()).toBe(historyBaseline);
        const baseline = traffic.calls.length;
        await page.waitForTimeout(30_000);
        expect(traffic.calls.length).toBe(baseline);
        expect(traffic.limited).toEqual([]);
        expect(received.filter(item => item.body === adminBody)).toHaveLength(1);
        await expect(thread.getByText(reply.body, { exact: true })).toHaveCount(1);
        await testInfo.attach('idle-request-counts', { body: JSON.stringify({ baseline, idleAdditional: traffic.calls.length - baseline, limited: traffic.limited }), contentType: 'application/json' });
      } finally {
        riderSocket.disconnect();
        riderSocket.removeAllListeners();
      }
    });
  });

  test('receives a peer receipt without fetching history or acknowledging again', async ({ page }) => {
    await fixture(async ({ riderApi, conversation, rider }) => {
      const seed = await sendRider(riderApi, conversation.id, `Receipt fixture ${crypto.randomUUID()}`);
      conversation.lastMessage = seed;
      const traffic = monitor(page, conversation.id);
      await openInbox(page, conversation);
      await expect(page.locator('section [aria-live="polite"]').getByText(seed.body, { exact: true })).toBeVisible();
      await page.waitForTimeout(1500);
      const baseline = traffic.calls.length;
      const receipts = traffic.receipts.length;
      expect((await riderApi.put(`${API_BASE_URL}/conversations/${conversation.id}/read`)).ok()).toBeTruthy();
      await expect.poll(() => traffic.receipts.slice(receipts).some(packet => packet.includes(conversation.id) && packet.includes(rider.id))).toBe(true);
      await page.waitForTimeout(1500);
      expect(traffic.calls.length).toBe(baseline);
      expect(traffic.limited).toEqual([]);
    });
  });

  test('keeps messages unread while the narrow conversation sheet is closed and acknowledges on reopen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fixture(async ({ adminApi, riderApi, conversation }) => {
      const seed = await sendRider(riderApi, conversation.id, `Sheet fixture ${crypto.randomUUID()}`);
      conversation.lastMessage = seed;
      const traffic = monitor(page, conversation.id);
      await openInbox(page, conversation, true);
      await expect(page.getByRole('dialog').getByText(seed.body, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Back to conversations' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.waitForTimeout(1500);
      const baseline = traffic.calls.length;
      const reply = await sendRider(riderApi, conversation.id, `Closed sheet ${crypto.randomUUID()}`);
      const row = page.getByRole('button').filter({ has: page.getByText(reply.body, { exact: true }) });
      await expect(row).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1500);
      expect(traffic.calls.length).toBe(baseline);
      const inbox = await adminApi.get(`${API_BASE_URL}/conversations?limit=100`);
      expect(inbox.ok()).toBeTruthy();
      expect((await inbox.json()).conversations.find((item: ConversationSummary) => item.id === conversation.id).unreadCount).toBeGreaterThan(0);
      await row.click();
      await expect(page.getByRole('dialog').getByText(reply.body, { exact: true })).toBeVisible();
      await expect.poll(() => traffic.calls.slice(baseline).filter(item => item.startsWith('PUT ')).length).toBe(1);
      await expect.poll(async () => {
        const response = await adminApi.get(`${API_BASE_URL}/conversations?limit=100`);
        expect(response.ok()).toBeTruthy();
        return (await response.json()).conversations.find((item: ConversationSummary) => item.id === conversation.id).unreadCount;
      }).toBe(0);
      await page.waitForTimeout(1500);
      expect(traffic.calls.slice(baseline).filter(item => item.startsWith('PUT '))).toHaveLength(1);
      expect(traffic.limited).toEqual([]);
    });
  });
});
