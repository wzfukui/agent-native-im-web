import { describe, expect, it } from 'vitest'
import { normalizeCopiedMessageText } from './MessageActionMenu'

describe('normalizeCopiedMessageText', () => {
  it('collapses excessive blank lines and trims trailing whitespace', () => {
    expect(
      normalizeCopiedMessageText('hello  \r\n\r\n\r\nworld\t\t\r\n\r\n')
    ).toBe('hello\n\nworld')
  })

  it('preserves a single intentional blank line between paragraphs', () => {
    expect(
      normalizeCopiedMessageText('line 1\n\nline 2')
    ).toBe('line 1\n\nline 2')
  })
})
