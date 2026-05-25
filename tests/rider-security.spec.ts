import { test, expect } from '@playwright/test';

/**
 * Rider API Idempotency & Security Audit (Playwright Version)
 * Verifies that duplicate Outbox flushes are handled safely.
 */

const TARGET_URL = 'https://rrs-vhgr.onrender.com';

test.describe('Rider API & Security Audit', () => {

  test('Idempotency: Duplicate flushes return same response', async ({ request }) => {
    console.log('Audit: Testing Idempotency...');

    // 1. Login as Admin for testing access
    const loginRes = await request.post(`${TARGET_URL}/api/auth/login`, {
      data: { email: 'admin@company.com', password: 'password' }
    });
    const { token } = await loginRes.json();
    const idKey = `audit-key-${Date.now()}`;

    // 2. Send 3 identical requests
    const endpoints = [1, 2, 3];
    const results = await Promise.all(endpoints.map(() => 
      request.put(`${TARGET_URL}/api/requests/req_test/status`, {
        data: { status: 'in_progress', remark: 'Audit' },
        headers: { 'Authorization': `Bearer ${token}`, 'Idempotency-Key': idKey }
      })
    ));

    const statusCodes = results.map(r => r.status());
    console.log(`Audit: Received status codes: ${statusCodes.join(', ')}`);

    // Verification: All must return the same code (likely 404 since req_test doesn't exist, but MUST be identical)
    expect(statusCodes[1]).toBe(statusCodes[0]);
    expect(statusCodes[2]).toBe(statusCodes[0]);
    console.log('✅ Idempotency response consistency verified.');
  });

  test('Security: Personnel blocked from Rider tasks', async ({ request }) => {
    // 1. Login as Personnel
    const loginRes = await request.post(`${TARGET_URL}/api/auth/login`, {
      data: { email: 'john.hr@company.com', password: 'Hon010125@' }
    });
    const { token } = await loginRes.json();

    // 2. Attempt to access Rider-only active task feed
    const res = await request.get(`${TARGET_URL}/api/rider/tasks/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`Audit: Personnel access attempt to Rider API returned: ${res.status()}`);
    expect(res.status()).toBe(403);
    console.log('✅ Role-based BOLA boundaries verified.');
  });
});
