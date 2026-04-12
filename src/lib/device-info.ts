export type DeviceDisplayKind = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface DeviceDisplayInfo {
  label: string
  kind: DeviceDisplayKind
}

export function parseConnectedDeviceInfo(info: string, unknownLabel = 'Unknown device'): DeviceDisplayInfo {
  if (!info) return { label: unknownLabel, kind: 'unknown' }

  const raw = info.trim()
  const lower = raw.toLowerCase()

  const nativeMatch = raw.match(/^(ios|android)\s+(.+)$/i)
  if (nativeMatch) {
    const platform = nativeMatch[1].toLowerCase() === 'ios' ? 'iOS' : 'Android'
    return {
      label: `ANI Mobile / ${platform} ${nativeMatch[2]}`.trim(),
      kind: platform === 'iOS' ? 'mobile' : 'mobile',
    }
  }

  const browserMatch = raw.match(/(Chrome|Firefox|Safari|Edge|Opera|Brave)\/(\d+)\.[\d.]+/)
  const browser = browserMatch ? `${browserMatch[1]}/${browserMatch[2]}` : null

  let os: string | null = null
  if (raw.includes('Mac OS')) os = 'macOS'
  else if (raw.includes('Windows NT')) os = 'Windows'
  else if (raw.includes('Linux')) os = 'Linux'
  else if (raw.includes('Android')) os = 'Android'
  else if (raw.includes('iPhone') || raw.includes('iPad')) os = 'iOS'

  const isTablet = raw.includes('iPad') || lower.includes('tablet')
  const isMobile = !isTablet && (raw.includes('iPhone') || raw.includes('Android') || lower.includes('mobile'))
  const kind: DeviceDisplayKind = isTablet ? 'tablet' : isMobile ? 'mobile' : os ? 'desktop' : 'unknown'

  const parts = [browser, os].filter(Boolean)
  return {
    label: parts.length > 0 ? parts.join(' / ') : raw.slice(0, 50),
    kind,
  }
}
