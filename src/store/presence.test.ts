import { beforeEach, describe, expect, it } from 'vitest'
import { usePresenceStore } from './presence'

describe('presence store', () => {
  beforeEach(() => {
    usePresenceStore.setState({
      online: new Set<number>(),
      known: new Set<number>(),
      wsConnected: false,
      lastSyncAt: null,
    })
  })

  it('tracks refreshed presence as online/offline instead of treating every miss as offline', () => {
    const { setOnline, setPresenceBatch, getPresenceState } = usePresenceStore.getState()
    setOnline(99, true)
    setOnline(1, true)
    setOnline(2, true)

    setPresenceBatch([1, 2, 3], [2, 3])

    expect(getPresenceState(1)).toBe('offline')
    expect(getPresenceState(2)).toBe('online')
    expect(getPresenceState(3)).toBe('online')
    expect(getPresenceState(99)).toBe('online')
  })

  it('can clear stale presence back to unknown', () => {
    const { setPresenceBatch, setPresenceUnknown, getPresenceState } = usePresenceStore.getState()
    setPresenceBatch([1, 2], [2])
    setPresenceUnknown([1, 2])

    expect(getPresenceState(1)).toBe('unknown')
    expect(getPresenceState(2)).toBe('unknown')
  })
})
