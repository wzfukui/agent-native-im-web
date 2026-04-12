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

    // Ensure a registration exists before awaiting readiness.
    let registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js')
    }
    await navigator.serviceWorker.ready

    // Unsubscribe any existing push subscription first
    // (handles VAPID key rotation gracefully)
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await existing.unsubscribe()
    }

    // Request notification permission if not granted
    // Note: iOS PWA may not have window.Notification, use Notification only if available
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return false
      }
      if (Notification.permission === 'denied') return false
    }

    // Subscribe to push with current VAPID key
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.data.public_key) as BufferSource,
    })

    const sub = subscription.toJSON()
    if (!sub.endpoint || !sub.keys) return false

    // Send subscription to server
    const res = await api.registerPush(token, {
      provider: 'webpush',
      platform: 'web',
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

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export function isPushSupported(): boolean {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window
}
