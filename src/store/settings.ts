import { create } from 'zustand'

export type Theme = 'dark' | 'midnight' | 'light' | 'green'
export type Locale = 'en' | 'zh-CN'

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

interface SettingsState {
  theme: Theme
  locale: Locale
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: loadSetting<Theme>('aim_theme', 'dark'),
  locale: loadSetting<Locale>('aim_locale', 'en'),
  setTheme: (theme) => {
    localStorage.setItem('aim_theme', JSON.stringify(theme))
    document.documentElement.dataset.theme = theme
    set({ theme })
  },
  setLocale: (locale) => {
    localStorage.setItem('aim_locale', JSON.stringify(locale))
    set({ locale })
  },
}))
