type MinimalLocation = Pick<Location, 'href' | 'replace'>
type MinimalNavigator = { serviceWorker?: { getRegistrations?: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> }>> } }
type MinimalCaches = { keys?: () => Promise<string[]>; delete?: (key: string) => Promise<boolean> }

export async function hardReloadToLatest(
  locationObj: MinimalLocation = window.location,
  navigatorObj: MinimalNavigator = navigator,
  cachesObj: MinimalCaches | undefined = typeof caches === 'undefined' ? undefined : caches,
) {
  try {
    const registrations = await navigatorObj.serviceWorker?.getRegistrations?.()
    if (registrations?.length) {
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
  } catch {
    // best effort: stale service workers should not block the user from refreshing
  }

  try {
    const keys = cachesObj ? await cachesObj.keys?.() : undefined
    if (keys?.length) {
      await Promise.all(keys.map((key) => cachesObj?.delete?.(key)))
    }
  } catch {
    // best effort: cache cleanup may fail in private mode or non-PWA contexts
  }

  const nextUrl = new URL(locationObj.href)
  nextUrl.searchParams.set('__reload', Date.now().toString())
  locationObj.replace(nextUrl.toString())
}
