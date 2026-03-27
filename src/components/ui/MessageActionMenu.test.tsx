import { describe, expect, it } from 'vitest'
import { normalizeCopiedMessageText } from './MessageActionMenu'

describe('normalizeCopiedMessageText', () => {
  it('trims trailing whitespace while preserving intentional paragraph spacing', () => {
    expect(
      normalizeCopiedMessageText('hello  \r\n\r\n\r\nworld\t\t\r\n\r\n')
    ).toBe('hello\n\n\nworld')
  })

  it('preserves a single intentional blank line between paragraphs', () => {
    expect(
      normalizeCopiedMessageText('line 1\n\nline 2')
    ).toBe('line 1\n\nline 2')
  })
})
