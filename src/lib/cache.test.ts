import { describe, it, expect } from 'vitest'
import {
  getCachedConversations,
  getCachedMessages,
  getCachedEntities,
  getCachedUser,
  cacheConversations,
  cacheMessages,
  cacheEntities,
  cacheUser,
  clearCache,
  enqueueOutboxMessage,
  listOutboxMessages,
  deleteOutboxMessage,
  getOutboxMessageByTempId,
} from './cache'

// jsdom does not provide IndexedDB, so all cache functions should
// gracefully return empty/null values instead of throwing.
// This validates the try/catch fallback behavior in every function.

describe('cache functions (no IndexedDB)', () => {
  it('getCachedConversations returns empty array', async () => {
    const result = await getCachedConversations()
    expect(result).toEqual([])
  })

  it('getCachedMessages returns empty array', async () => {
    const result = await getCachedMessages(1)
    expect(result).toEqual([])
  })

  it('getCachedEntities returns empty array', async () => {
    const result = await getCachedEntities()
    expect(result).toEqual([])
  })

  it('getCachedUser returns null', async () => {
    const result = await getCachedUser()
    expect(result).toBeNull()
  })

  it('cacheConversations does not throw', async () => {
    await expect(cacheConversations([])).resolves.not.toThrow()
  })

  it('cacheMessages does not throw', async () => {
    await expect(cacheMessages(1, [])).resolves.not.toThrow()
  })

  it('cacheEntities does not throw', async () => {
    await expect(cacheEntities([])).resolves.not.toThrow()
  })

  it('cacheUser does not throw', async () => {
    await expect(cacheUser({ id: 1, name: 'test' } as never)).resolves.not.toThrow()
  })

  it('clearCache does not throw', async () => {
    await expect(clearCache()).resolves.not.toThrow()
  })

  it('enqueueOutboxMessage returns null when IDB unavailable', async () => {
    const result = await enqueueOutboxMessage({
      temp_id: 'tmp-1',
      conversation_id: 1,
      text: 'hello',
      created_at: new Date().toISOString(),
    })
    expect(result).toBeNull()
  })

  it('listOutboxMessages returns empty array', async () => {
    const result = await listOutboxMessages()
    expect(result).toEqual([])
  })

  it('deleteOutboxMessage does not throw', async () => {
    await expect(deleteOutboxMessage(1)).resolves.not.toThrow()
  })

  it('getOutboxMessageByTempId returns null', async () => {
    const result = await getOutboxMessageByTempId('tmp-1')
    expect(result).toBeNull()
  })
})
