// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'New Message', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      conversation_id: payload.conversation_id,
      message_id: payload.message_id,
    },
    tag: `conv-${payload.conversation_id}`,
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'Agent-Native IM', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
