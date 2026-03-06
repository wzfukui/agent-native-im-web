import { describe, expect, it } from 'vitest'
import { extractError } from './errors'

describe('extractError classification', () => {
  it('classifies auth errors', () => {
    const parsed = extractError({
      ok: false,
      error: {
        code: 'AUTH_INVALID',
        message: 'invalid token',
        request_id: 'r1',
        status: 401,
        timestamp: '',
        method: 'GET',
        path: '/api/v1/me',
      },
    })
    expect(parsed.category).toBe('auth')
    expect(parsed.guidanceKey).toBe('error.guidance.auth')
  })

  it('classifies permission errors', () => {
    const parsed = extractError({
      ok: false,
      error: {
        code: 'PERM_NOT_PARTICIPANT',
        message: 'forbidden',
        request_id: 'r2',
        status: 403,
        timestamp: '',
        method: 'GET',
        path: '/api/v1/conversations/1',
      },
    })
    expect(parsed.category).toBe('permission')
  })

  it('classifies server errors', () => {
    const parsed = extractError({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'oops',
        request_id: 'r3',
        status: 500,
        timestamp: '',
        method: 'POST',
        path: '/api/v1/messages/send',
      },
    })
    expect(parsed.category).toBe('server')
  })
})
