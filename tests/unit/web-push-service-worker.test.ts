import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const serviceWorkerSource = readFileSync(resolve(process.cwd(), 'public/push-sw.js'), 'utf8');

function installWorker(clients: any[] = []) {
  const handlers = new Map<string, (event: any) => void>();
  const worker = {
    location: { origin: 'https://rider.example' },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients: {
      matchAll: vi.fn().mockResolvedValue(clients),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    addEventListener: vi.fn((name: string, handler: (event: any) => void) => handlers.set(name, handler)),
  };
  new Function('self', serviceWorkerSource)(worker);
  return { worker, handlers };
}

describe('Web Push service-worker behavior', () => {
  it('shows push immediately with a stable notification identifier', async () => {
    const { worker, handlers } = installWorker();
    let shown: Promise<unknown> | undefined;
    handlers.get('push')?.({
      data: { json: () => ({ title: 'Request approved', body: 'Your request was approved.', tag: 'notif-1', data: { notificationId: 'notif-1', requestId: 'req-1' } }) },
      waitUntil: (promise: Promise<unknown>) => { shown = promise; },
    });
    await shown;

    expect(worker.registration.showNotification).toHaveBeenCalledWith('Request approved', expect.objectContaining({ tag: 'notif-1' }));
  });

  it('focuses an existing same-origin app window on a valid request path', async () => {
    const client = { url: 'https://rider.example/admin/dashboard', navigate: vi.fn(), focus: vi.fn().mockResolvedValue(undefined) };
    const { handlers } = installWorker([client]);
    let clicked: Promise<unknown> | undefined;
    handlers.get('notificationclick')?.({
      notification: { data: { role: 'admin', url: '/admin/dashboard?request=req-1' }, close: vi.fn() },
      waitUntil: (promise: Promise<unknown>) => { clicked = promise; },
    });
    await clicked;

    expect(client.navigate).toHaveBeenCalledWith('/admin/dashboard?request=req-1');
    expect(client.focus).toHaveBeenCalledOnce();
  });

  it('rejects an off-origin target and opens the matching role home', async () => {
    const { worker, handlers } = installWorker();
    let clicked: Promise<unknown> | undefined;
    handlers.get('notificationclick')?.({
      notification: { data: { role: 'admin', url: 'https://attacker.example/phish' }, close: vi.fn() },
      waitUntil: (promise: Promise<unknown>) => { clicked = promise; },
    });
    await clicked;

    expect(worker.clients.openWindow).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('falls back to Personnel/V2 for malformed destinations and personnel payloads', async () => {
    const { worker, handlers } = installWorker();
    let clicked: Promise<unknown> | undefined;
    handlers.get('notificationclick')?.({
      notification: { data: { role: 'personnel', url: 'javascript:alert(1)' }, close: vi.fn() },
      waitUntil: (promise: Promise<unknown>) => { clicked = promise; },
    });
    await clicked;

    expect(worker.clients.openWindow).toHaveBeenCalledWith('/personnel/v2');
  });
});
