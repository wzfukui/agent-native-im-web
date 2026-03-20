import type { BuildInfo } from './build-info'

export async function fetchLatestBuildInfo(fetchImpl: typeof fetch = fetch): Promise<BuildInfo | null> {
  try {
    const res = await fetchImpl(`/build-info.json?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!res.ok) return null
    const parsed = await res.json() as Partial<BuildInfo>
    if (!parsed.version || !parsed.commit || !parsed.buildTime) return null
    return {
      version: parsed.version,
      commit: parsed.commit,
      buildTime: parsed.buildTime,
    }
  } catch {
    return null
  }
}

export function isBuildStale(current: BuildInfo, latest: BuildInfo | null): boolean {
  if (!latest) return false
  if (latest.commit && latest.commit !== current.commit) return true
  if (latest.version !== current.version) return true
  return latest.buildTime !== current.buildTime
}
