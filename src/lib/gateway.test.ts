import { beforeEach, describe, expect, it, vi } from 'vitest'

const { setBaseUrl } = vi.hoisted(() => ({
  setBaseUrl: vi.fn(),
}))

vi.mock('./api', () => ({
  setBaseUrl,
}))

describe('web gateway helpers', () => {
  beforeEach(() => {
    const backing = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => backing.get(key) ?? null,
        setItem: (key: string, value: string) => { backing.set(key, value) },
        removeItem: (key: string) => { backing.delete(key) },
      },
    })
    vi.resetModules()
    setBaseUrl.mockReset()
  })

  it('normalizes a custom gateway and persists it', async () => {
    const gateway = await import('./gateway')
    const saved = gateway.persistGatewayUrl('demo.example.com///')

    expect(saved).toBe('https://demo.example.com')
    expect(gateway.getGatewayUrl()).toBe('https://demo.example.com')
    expect(setBaseUrl).toHaveBeenLastCalledWith('https://demo.example.com')
  })

  it('uses relative requests for the default gateway', async () => {
    const gateway = await import('./gateway')
    gateway.clearGatewayUrl()
    gateway.applyGatewayUrl()

    expect(gateway.getGatewayUrl()).toBe(gateway.getDefaultGatewayUrl())
    expect(setBaseUrl).toHaveBeenLastCalledWith('')
  })
})
