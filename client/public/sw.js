self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const title = payload.title || 'Dawwar';
  const options = {
    body: payload.body || 'A task update is ready.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: payload.url || '/office' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/office';
  event.waitUntil(clients.openWindow(url));
});
