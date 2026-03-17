import type { Conversation, Message, Entity } from './types'

const DB_NAME = 'aim_cache'
const DB_VERSION = 4

export interface OutboxMessage {
  id?: number
  temp_id: string
  conversation_id: number
  content_type?: string
  text: string
  mentions?: number[]
  reply_to?: number
  created_at: string
  attempts?: number
  last_error?: string
  last_attempt_at?: string
  sync_state?: 'queued' | 'sending' | 'failed'
}

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
      if (!db.objectStoreNames.contains('entities')) {
        db.createObjectStore('entities', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        outbox.createIndex('conversation_id', 'conversation_id', { unique: false })
        outbox.createIndex('created_at', 'created_at', { unique: false })
        outbox.createIndex('temp_id', 'temp_id', { unique: true })
        outbox.createIndex('sync_state', 'sync_state', { unique: false })
      } else {
        const outbox = req.transaction?.objectStore('outbox')
        if (outbox && !outbox.indexNames.contains('temp_id')) {
          outbox.createIndex('temp_id', 'temp_id', { unique: true })
        }
        if (outbox && !outbox.indexNames.contains('sync_state')) {
          outbox.createIndex('sync_state', 'sync_state', { unique: false })
        }
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
  } catch { /* IndexedDB may be unavailable */ }
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
  } catch { /* IndexedDB may be unavailable */ }
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
  } catch { /* IndexedDB may be unavailable */ }
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

export async function cacheEntities(entities: Entity[]) {
  try {
    const store = await tx('entities', 'readwrite')
    store.clear()
    for (const e of entities) {
      store.put(e)
    }
  } catch { /* IndexedDB may be unavailable */ }
}

export async function getCachedEntities(): Promise<Entity[]> {
  try {
    const store = await tx('entities', 'readonly')
    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function clearCache() {
  try {
    const db = await openDB()
    const txn = db.transaction(['conversations', 'messages', 'meta', 'entities', 'outbox'], 'readwrite')
    txn.objectStore('conversations').clear()
    txn.objectStore('messages').clear()
    txn.objectStore('meta').clear()
    txn.objectStore('entities').clear()
    txn.objectStore('outbox').clear()
  } catch { /* IndexedDB may be unavailable */ }
}

export async function enqueueOutboxMessage(msg: OutboxMessage): Promise<number | null> {
  try {
    const store = await tx('outbox', 'readwrite')
    return new Promise((resolve) => {
      const idx = store.index('temp_id')
      const getReq = idx.get(msg.temp_id)
      getReq.onsuccess = () => {
        const existing = getReq.result as OutboxMessage | undefined
        if (existing?.id) {
          resolve(existing.id)
          return
        }
        const addReq = store.add({
          ...msg,
          attempts: msg.attempts || 0,
          sync_state: msg.sync_state || 'queued',
        } as OutboxMessage)
        addReq.onsuccess = () => resolve(Number(addReq.result))
        addReq.onerror = () => resolve(null)
      }
      getReq.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function listOutboxMessages(): Promise<OutboxMessage[]> {
  try {
    const store = await tx('outbox', 'readonly')
    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve((req.result || []) as OutboxMessage[])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function listOutboxMessagesByConversation(conversationId: number): Promise<OutboxMessage[]> {
  try {
    const store = await tx('outbox', 'readonly')
    return new Promise((resolve) => {
      const idx = store.index('conversation_id')
      const req = idx.getAll(conversationId)
      req.onsuccess = () => resolve((req.result || []) as OutboxMessage[])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function deleteOutboxMessage(id: number): Promise<void> {
  try {
    const store = await tx('outbox', 'readwrite')
    store.delete(id)
  } catch { /* IndexedDB may be unavailable */ }
}

export async function updateOutboxMessage(id: number, patch: Partial<OutboxMessage>): Promise<void> {
  try {
    const store = await tx('outbox', 'readwrite')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const current = getReq.result as OutboxMessage | undefined
      if (!current) return
      store.put({ ...current, ...patch } as OutboxMessage)
    }
  } catch { /* IndexedDB may be unavailable */ }
}

export async function getOutboxMessageByTempId(tempId: string): Promise<OutboxMessage | null> {
  try {
    const store = await tx('outbox', 'readonly')
    return new Promise((resolve) => {
      const req = store.index('temp_id').get(tempId)
      req.onsuccess = () => resolve((req.result as OutboxMessage) || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
