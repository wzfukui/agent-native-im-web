import { describe, it, expect } from 'vitest'
import { getInitials, entityDisplayName, entityColor, formatFileSize, truncate } from './utils'
import type { Entity } from './types'

describe('getInitials', () => {
  it('returns first char uppercased for English name', () => {
    expect(getInitials('chris')).toBe('C')
  })

  it('returns first char for Chinese name', () => {
    expect(getInitials('傅奎')).toBe('傅')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })

  it('handles whitespace-only string', () => {
    expect(getInitials('   ')).toBe('')
  })
})

describe('entityDisplayName', () => {
  it('returns display_name when present', () => {
    expect(entityDisplayName({ display_name: 'SuperBody', name: 'superbody' } as Entity)).toBe('SuperBody')
  })

  it('falls back to name when display_name is empty', () => {
    expect(entityDisplayName({ display_name: '', name: 'superbody' } as Entity)).toBe('superbody')
  })

  it('returns Unknown for null/undefined', () => {
    expect(entityDisplayName(null)).toBe('Unknown')
    expect(entityDisplayName(undefined)).toBe('Unknown')
  })
})

describe('entityColor', () => {
  it('returns bot color for bot entities', () => {
    expect(entityColor({ entity_type: 'bot', name: 'test' } as Entity)).toBe('#a78bfa')
  })

  it('returns service color for service entities', () => {
    expect(entityColor({ entity_type: 'service', name: 'test' } as Entity)).toBe('#f59e0b')
  })

  it('returns a color from palette for user entities', () => {
    const colors = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c']
    const color = entityColor({ entity_type: 'user', name: 'alice' } as Entity)
    expect(colors).toContain(color)
  })

  it('returns default for null entity', () => {
    expect(entityColor(null)).toBe('#6366f1')
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(5242880)).toBe('5.0 MB')
  })
})

describe('truncate', () => {
  it('returns string as-is when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates with ellipsis when over limit', () => {
    expect(truncate('hello world', 6)).toBe('hello\u2026')
  })

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})
