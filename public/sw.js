const CACHE_NAME = 'planit-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

// Install Event - Precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate for assets, Network-first for pages
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and API calls
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests (HTML pages) -> Network first, fallback to cached '/'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/');
          return fallback || Response.error();
        })
    );
    return;
  }

  // Static Assets (scripts, styles, images, fonts) -> Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

function isPushPayload(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    typeof value.url === 'string' &&
    typeof value.tag === 'string' &&
    typeof value.notificationId === 'string'
  );
}

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Planit — nouvelle notification',
    body: 'Vous avez une nouvelle notification.',
    url: '/',
    tag: 'planit-notification',
    notificationId: 'unknown',
  };

  let payload = fallback;
  if (event.data) {
    try {
      const parsed = JSON.parse(event.data.text());
      if (isPushPayload(parsed)) payload = parsed;
    } catch (error) {
      console.warn('Invalid Web Push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      data: { url: payload.url, notificationId: payload.notificationId },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let target = '/';
  if (typeof data.url === 'string') {
    try {
      const resolved = new URL(data.url, self.location.origin);
      if (resolved.origin === self.location.origin) target = `${resolved.pathname}${resolved.search}`;
    } catch (error) {
      console.warn('Invalid notification URL:', error);
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => client.url.includes(target));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
