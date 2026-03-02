import type { Conversation, Message, Entity } from './types'

const DB_NAME = 'aim_cache'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB()
  return db.transaction(storeName, mode).objectStore(storeName)
}

export async function cacheConversations(convs: Conversation[]) {
  try {
    const store = await tx('conversations', 'readwrite')
    // Clear and rewrite
    store.clear()
    for (const c of convs) {
      store.put(c)
    }
  } catch {}
}

export async function getCachedConversations(): Promise<Conversation[]> {
  try {
    const store = await tx('conversations', 'readonly')
    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function cacheMessages(convId: number, msgs: Message[]) {
  try {
    const store = await tx('messages', 'readwrite')
    store.put({ key: `conv_${convId}`, messages: msgs.slice(-50) }) // cache last 50
  } catch {}
}

export async function getCachedMessages(convId: number): Promise<Message[]> {
  try {
    const store = await tx('messages', 'readonly')
    return new Promise((resolve) => {
      const req = store.get(`conv_${convId}`)
      req.onsuccess = () => resolve(req.result?.messages || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function cacheUser(user: Entity) {
  try {
    const store = await tx('meta', 'readwrite')
    store.put({ key: 'current_user', data: user })
  } catch {}
}

export async function getCachedUser(): Promise<Entity | null> {
  try {
    const store = await tx('meta', 'readonly')
    return new Promise((resolve) => {
      const req = store.get('current_user')
      req.onsuccess = () => resolve(req.result?.data || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function clearCache() {
  try {
    const db = await openDB()
    const txn = db.transaction(['conversations', 'messages', 'meta'], 'readwrite')
    txn.objectStore('conversations').clear()
    txn.objectStore('messages').clear()
    txn.objectStore('meta').clear()
  } catch {}
}
