import type { Conversation, Message, Entity } from './types'

const DB_NAME = 'aim_cache'
const DB_VERSION = 3

export interface OutboxMessage {
  id?: number
  temp_id: string
  conversation_id: number
  content_type?: string
  text: string
  mentions?: number[]
  reply_to?: number
  created_at: string
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
      if (!db.objectStoreNames.contains('outbox')) {
        const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        outbox.createIndex('conversation_id', 'conversation_id', { unique: false })
        outbox.createIndex('created_at', 'created_at', { unique: false })
        outbox.createIndex('temp_id', 'temp_id', { unique: true })
      } else {
        const outbox = req.transaction?.objectStore('outbox')
        if (outbox && !outbox.indexNames.contains('temp_id')) {
          outbox.createIndex('temp_id', 'temp_id', { unique: true })
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
    const txn = db.transaction(['conversations', 'messages', 'meta', 'outbox'], 'readwrite')
    txn.objectStore('conversations').clear()
    txn.objectStore('messages').clear()
    txn.objectStore('meta').clear()
    txn.objectStore('outbox').clear()
  } catch {}
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
        const addReq = store.add(msg)
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
  } catch {}
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
