import { describe, expect, it } from 'vitest'
import { needsFirstBot } from './first-login'

describe('needsFirstBot', () => {
  it('requires bot creation for first-time users without bots', () => {
    expect(needsFirstBot(false)).toBe(true)
  })

  it('lets returning users start chats once they already have bots', () => {
    expect(needsFirstBot(true)).toBe(false)
  })
})
