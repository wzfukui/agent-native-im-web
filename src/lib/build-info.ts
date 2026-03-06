export type BuildInfo = {
  version: string
  commit: string
  buildTime: string
}

export const buildInfo: BuildInfo = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  buildTime: __APP_BUILD_TIME__,
}
