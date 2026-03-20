import { describe, expect, it, vi } from 'vitest'
import { fetchLatestBuildInfo, isBuildStale } from './update-check'

describe('update-check', () => {
  it('detects stale builds when commit changes', () => {
    expect(isBuildStale(
      { version: '1.0.0', commit: 'abc', buildTime: '2026-03-21T00:00:00Z' },
      { version: '1.0.0', commit: 'def', buildTime: '2026-03-21T00:00:00Z' },
    )).toBe(true)
  })

  it('coalesces missing or invalid build info to null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const latest = await fetchLatestBuildInfo(fetchImpl as unknown as typeof fetch)
    expect(latest).toBeNull()
  })
})
