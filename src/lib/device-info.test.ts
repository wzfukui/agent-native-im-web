import { describe, expect, it } from 'vitest'
import { parseConnectedDeviceInfo } from './device-info'

describe('parseConnectedDeviceInfo', () => {
  it('labels native iOS clients as mobile', () => {
    expect(parseConnectedDeviceInfo('ios 26.3.1')).toEqual({
      label: 'ANI Mobile / iOS 26.3.1',
      kind: 'mobile',
    })
  })

  it('labels browser desktops with browser and platform', () => {
    expect(parseConnectedDeviceInfo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36')).toEqual({
      label: 'Chrome/136 / macOS',
      kind: 'desktop',
    })
  })

  it('falls back to unknown label when device info is empty', () => {
    expect(parseConnectedDeviceInfo('', 'Unknown device')).toEqual({
      label: 'Unknown device',
      kind: 'unknown',
    })
  })
})
