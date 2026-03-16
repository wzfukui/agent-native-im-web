/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

// Precache static assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA navigation fallback — serve index.html for all navigation requests
// except API calls and file downloads
const handler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(handler, {
  denylist: [/^\/api\//, /^\/files\//],
}))

// Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
)

// Google Fonts webfont files
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// API calls: network-first with short cache fallback
registerRoute(
  /\/api\//i,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 })],
    networkTimeoutSeconds: 10,
  })
)

// --- Push Notification Handlers (migrated from public/sw.js) ---

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; conversation_id?: string; message_id?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'New Message', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      conversation_id: payload.conversation_id,
      message_id: payload.message_id,
    },
    tag: `conv-${payload.conversation_id}`,
    renotify: true,
  } as NotificationOptions & { renotify: boolean }

  event.waitUntil(self.registration.showNotification(payload.title || 'Agent-Native IM', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow('/')
    })
  )
})
