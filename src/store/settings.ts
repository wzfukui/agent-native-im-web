import { create } from 'zustand'

export type Theme = 'system' | 'dark' | 'midnight' | 'light' | 'green' | 'rose' | 'ocean' | 'amber' | 'violet' | 'light-rose' | 'light-ocean' | 'light-green'
export type Locale = 'en' | 'zh-CN'

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/** Resolve the effective CSS theme for `data-theme` based on system preference */
function resolveSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

function applyTheme(theme: Theme) {
  const effective = theme === 'system' ? resolveSystemTheme() : theme
  document.documentElement.dataset.theme = effective
}

interface SettingsState {
  theme: Theme
  locale: Locale
  devMode: boolean
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
  setDevMode: (devMode: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: loadSetting<Theme>('aim_theme', 'dark'),
  locale: loadSetting<Locale>('aim_locale', 'en'),
  devMode: loadSetting<boolean>('aim_dev_mode', false),
  setTheme: (theme) => {
    localStorage.setItem('aim_theme', JSON.stringify(theme))
    applyTheme(theme)
    set({ theme })
  },
  setLocale: (locale) => {
    localStorage.setItem('aim_locale', JSON.stringify(locale))
    set({ locale })
  },
  setDevMode: (devMode) => {
    localStorage.setItem('aim_dev_mode', JSON.stringify(devMode))
    set({ devMode })
  },
}))

// Listen for OS color scheme changes when theme is "system"
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    const currentTheme = useSettingsStore.getState().theme
    if (currentTheme === 'system') {
      applyTheme('system')
    }
  })
}
