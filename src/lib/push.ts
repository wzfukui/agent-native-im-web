import * as api from './api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerPushNotifications(token: string): Promise<boolean> {
  if (!window.isSecureContext) {
    console.warn('Push notifications require a secure context (HTTPS). Skipping registration.')
    return false
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    // Get VAPID public key
    const keyRes = await api.getVapidKey()
    if (!keyRes.ok || !keyRes.data?.public_key) {
      return false
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.data.public_key) as BufferSource,
    })

    const sub = subscription.toJSON()
    if (!sub.endpoint || !sub.keys) return false

    // Send subscription to server
    const res = await api.registerPush(token, {
      endpoint: sub.endpoint,
      key_p256dh: sub.keys.p256dh!,
      key_auth: sub.keys.auth!,
    })

    return res.ok === true
  } catch (err) {
    console.warn('Push registration failed:', err)
    return false
  }
}
