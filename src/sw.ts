/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

// Activate updated workers immediately so stale app shells are replaced on refresh.
self.skipWaiting()
clientsClaim()

// Precache static assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA navigation: prefer the latest network HTML so refreshes do not keep serving
// a stale app shell that references already-rotated hashed chunks.
const cachedAppShell = createHandlerBoundToURL('/index.html')
const navigationStrategy = new NetworkFirst({
  cacheName: 'app-shell',
  plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  networkTimeoutSeconds: 3,
})

registerRoute(new NavigationRoute(async (options) => {
  const response = await navigationStrategy.handle(options)
  if (response) return response
  return cachedAppShell(options)
}, {
  denylist: [/^\/api\//, /^\/files\//],
}))

// Large JS/CSS chunks excluded from precache (mermaid, katex, cytoscape, etc.)
// are cached on first use so subsequent loads are instant.
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    (request.destination === 'script' || request.destination === 'style'),
  new CacheFirst({
    cacheName: 'lazy-chunks',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
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

  let payload: { title?: string; body?: string; kind?: string; path?: string; conversation_id?: string; message_id?: string }
  const isZh = navigator.language.startsWith('zh')
  try {
    payload = event.data.json()
  } catch {
    payload = { title: isZh ? '新消息' : 'New Message', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      kind: payload.kind,
      path: payload.path,
      conversation_id: payload.conversation_id,
      message_id: payload.message_id,
    },
    tag: payload.kind ? `kind-${payload.kind}` : `conv-${payload.conversation_id}`,
    renotify: true,
  } as NotificationOptions & { renotify: boolean }

  const fallbackTitle = isZh ? '新消息' : 'Agent-Native IM'
  event.waitUntil(self.registration.showNotification(payload.title || fallbackTitle, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const path = typeof data.path === 'string' && data.path
    ? data.path
    : typeof data.conversation_id === 'string' && data.conversation_id
      ? `/chat/${data.conversation_id}`
      : '/inbox'
  const destination = new URL(path, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          const windowClient = client as WindowClient
          await windowClient.focus()
          if ('navigate' in windowClient && windowClient.url !== destination) {
            return windowClient.navigate(destination)
          }
          return windowClient
        }
      }
      return self.clients.openWindow(destination)
    })
  )
})
