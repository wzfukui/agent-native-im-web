import { describe, expect, it, vi } from 'vitest'
import { hardReloadToLatest } from './reload-latest'

describe('hardReloadToLatest', () => {
  it('unregisters service workers, clears caches, and replaces the url', async () => {
    const unregister = vi.fn().mockResolvedValue(true)
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }])
    const deleteCache = vi.fn().mockResolvedValue(true)
    const keys = vi.fn().mockResolvedValue(['shell-v1', 'api-v1'])
    const replace = vi.fn()

    await hardReloadToLatest(
      { href: 'https://agent-native.im/chat/1', replace },
      { serviceWorker: { getRegistrations } },
      { keys, delete: deleteCache },
    )

    expect(getRegistrations).toHaveBeenCalledTimes(1)
    expect(unregister).toHaveBeenCalledTimes(1)
    expect(keys).toHaveBeenCalledTimes(1)
    expect(deleteCache).toHaveBeenCalledWith('shell-v1')
    expect(deleteCache).toHaveBeenCalledWith('api-v1')
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace.mock.calls[0][0]).toContain('__reload=')
  })
})
