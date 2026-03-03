import { describe, it, expect } from 'vitest'
import en from './en.json'
import zhCN from './zh-CN.json'

/** Flatten nested JSON keys into dot-notation set */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flattenKeys(v as Record<string, unknown>, path)) {
        keys.add(sub)
      }
    } else {
      keys.add(path)
    }
  }
  return keys
}

describe('i18n completeness', () => {
  const enKeys = flattenKeys(en as Record<string, unknown>)
  const zhKeys = flattenKeys(zhCN as Record<string, unknown>)

  it('en.json and zh-CN.json have the same number of keys', () => {
    expect(enKeys.size).toBe(zhKeys.size)
  })

  it('every en.json key exists in zh-CN.json', () => {
    const missing = [...enKeys].filter((k) => !zhKeys.has(k))
    expect(missing).toEqual([])
  })

  it('every zh-CN.json key exists in en.json', () => {
    const extra = [...zhKeys].filter((k) => !enKeys.has(k))
    expect(extra).toEqual([])
  })

  it('all values are non-empty strings', () => {
    const emptyEn: string[] = []
    const emptyZh: string[] = []

    function checkValues(obj: Record<string, unknown>, prefix: string, result: string[]) {
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          checkValues(v as Record<string, unknown>, path, result)
        } else if (typeof v !== 'string' || v.trim() === '') {
          result.push(path)
        }
      }
    }

    checkValues(en as Record<string, unknown>, '', emptyEn)
    checkValues(zhCN as Record<string, unknown>, '', emptyZh)

    expect(emptyEn).toEqual([])
    expect(emptyZh).toEqual([])
  })
})
