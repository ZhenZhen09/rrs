/* Web Push event handlers are imported by the generated vite-plugin-pwa worker. */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title || 'Rider Scheduling System';
  const body = payload.body || 'You have a new update.';
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/assets/images/logo.png',
      badge: '/assets/images/logo.png',
      tag: payload.tag || data.notificationId || (data.requestId ? `request-${data.requestId}` : 'rider-scheduling-update'),
      data,
      renotify: Boolean(payload.tag || data.notificationId || data.requestId),
    })
  );
});

function getSafeNotificationTarget(data) {
  const fallback = data?.role === 'admin' ? '/admin/dashboard' : '/personnel/v2';
  try {
    const target = new URL(data?.url || fallback, self.location.origin);
    if (target.origin !== self.location.origin || !target.pathname.startsWith('/')) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = getSafeNotificationTarget(event.notification.data);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
