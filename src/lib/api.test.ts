import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import { setSessionHooks } from './auth-session'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('api auth refresh', () => {
  beforeEach(() => {
    api.setBaseUrl('http://localhost:9800')
    setSessionHooks({
      getToken: () => null,
      setToken: () => {},
      onAuthFailure: () => {},
    })
  })

  it('retries request with refreshed token after 401', async () => {
    const setToken = vi.fn()
    const onAuthFailure = vi.fn()
    setSessionHooks({
      getToken: () => 'old-token',
      setToken,
      onAuthFailure,
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, error: 'invalid token' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { token: 'new-token' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, data: [] }))

    vi.stubGlobal('fetch', fetchMock)

    const res = await api.listEntities('old-token')
    expect(res.ok).toBe(true)
    expect(setToken).toHaveBeenCalledWith('new-token')
    expect(onAuthFailure).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const retryCall = fetchMock.mock.calls[2]
    const retryHeaders = retryCall[1]?.headers as Record<string, string>
    expect(retryHeaders.Authorization).toBe('Bearer new-token')
  })

  it('triggers auth failure callback when refresh fails', async () => {
    const setToken = vi.fn()
    const onAuthFailure = vi.fn()
    setSessionHooks({
      getToken: () => 'old-token',
      setToken,
      onAuthFailure,
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, error: 'invalid token' }))
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, error: 'expired' }))

    vi.stubGlobal('fetch', fetchMock)

    const res = await api.listEntities('old-token')
    expect(res.ok).toBe(false)
    expect(setToken).not.toHaveBeenCalled()
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('does not trigger auth failure callback on refresh 5xx', async () => {
    const setToken = vi.fn()
    const onAuthFailure = vi.fn()
    setSessionHooks({
      getToken: () => 'old-token',
      setToken,
      onAuthFailure,
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, error: 'invalid token' }))
      .mockResolvedValueOnce(jsonResponse(500, { ok: false, error: 'server error' }))

    vi.stubGlobal('fetch', fetchMock)

    const res = await api.listEntities('old-token')
    expect(res.ok).toBe(false)
    expect(setToken).not.toHaveBeenCalled()
    expect(onAuthFailure).not.toHaveBeenCalled()
  })
})
