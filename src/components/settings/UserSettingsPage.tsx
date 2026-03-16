import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore, type Theme, type Locale } from '@/store/settings'
import { AvatarPicker } from '@/components/entity/AvatarPicker'
import { cn } from '@/lib/utils'
import { buildInfo } from '@/lib/build-info'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import * as api from '@/lib/api'
import {
  User, Lock, Palette, Globe, ChevronLeft,
  Check, Loader2, Eye, EyeOff, Smartphone, LogOut, Info, Copy, Download,
} from 'lucide-react'

type Section = 'profile' | 'security' | 'devices' | 'theme' | 'language' | 'about'

interface Props {
  onBack: () => void
}

export function UserSettingsPage({ onBack }: Props) {
  const { t, i18n } = useTranslation()
  const entity = useAuthStore((s) => s.entity)
  const token = useAuthStore((s) => s.token)!
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const { theme, locale, setTheme, setLocale } = useSettingsStore()

  const [section, setSection] = useState<Section>('profile')
  const [editName, setEditName] = useState(entity?.display_name || '')
  const [editEmail, setEditEmail] = useState(entity?.email || '')
  const [editAvatar, setEditAvatar] = useState(entity?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Password
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [aboutCopied, setAboutCopied] = useState(false)
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)


  const handleSaveProfile = async () => {
    if (!editName.trim() || !entity) return
    setSaving(true)
    setSaveMsg('')
    const updateData: { display_name?: string; avatar_url?: string; email?: string } = {
      display_name: editName.trim()
    }
    if (editAvatar && editAvatar !== entity.avatar_url) {
      updateData.avatar_url = editAvatar
    }
    if (editEmail !== (entity.email || '')) {
      updateData.email = editEmail.trim()
    }
    const res = await api.updateProfile(token, updateData)
    if (res.ok && res.data) {
      setAuth(token, res.data)
      setSaveMsg(t('settings.profileSaved'))
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const handleChangePassword = async () => {
    setPassError('')
    setPassSuccess('')
    if (newPass.length < 6) {
      setPassError(t('settings.passwordTooShort'))
      return
    }
    if (newPass !== confirmPass) {
      setPassError(t('settings.passwordMismatch'))
      return
    }
    setSaving(true)
    const res = await api.changePassword(token, oldPass, newPass)
    setSaving(false)
    if (res.ok) {
      setPassSuccess(t('settings.passwordChanged'))
      setOldPass('')
      setNewPass('')
      setConfirmPass('')
    } else {
      setPassError(typeof res.error === 'string' ? res.error : res.error?.message || t('settings.passwordError'))
    }
  }

  // Devices
  type DeviceItem = { device_id: string; device_info: string; entity_id: number }
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [deviceMsg, setDeviceMsg] = useState('')
  const currentDeviceId = localStorage.getItem('aim_device_id') || ''

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true)
    setDeviceMsg('')  // Clear any previous messages
    const res = await api.listDevices(token)
    if (res.ok && res.data?.devices) {
      const rawDevices = res.data.devices || []

      // Group by device_id and keep only the latest/first connection per device
      const deviceMap = new Map<string, DeviceItem>()
      for (const device of rawDevices) {
        if (!deviceMap.has(device.device_id)) {
          deviceMap.set(device.device_id, device)
        }
      }

      const uniqueDevices = Array.from(deviceMap.values())

      setDevices(uniqueDevices)
    } else {
      setDevices([])
    }
    setDevicesLoading(false)
  }, [token])

  useEffect(() => {
    if (section === 'devices') {
      // Clear devices first to ensure clean state
      setDevices([])
      loadDevices()
    }
  }, [section, loadDevices])

  const handleKickDevice = async (deviceId: string) => {
    const res = await api.kickDevice(token, deviceId)
    if (res.ok) {
      setDeviceMsg(t('settings.deviceDisconnected'))
      setTimeout(() => setDeviceMsg(''), 2000)
      loadDevices()
    }
  }

  const handleKickOthers = async () => {
    const others = devices.filter((d) => d.device_id !== currentDeviceId)
    if (others.length === 0) {
      setDeviceMsg(t('settings.noOtherDevices'))
      setTimeout(() => setDeviceMsg(''), 2000)
      return
    }

    setDevicesLoading(true)
    let failed = 0
    for (const d of others) {
      const res = await api.kickDevice(token, d.device_id)
      if (!res.ok) failed++
    }

    if (failed > 0) {
      setDeviceMsg(t('settings.deviceDisconnectedPartial', { failed }))
    } else {
      setDeviceMsg(t('settings.allDevicesDisconnected'))
    }
    setTimeout(() => setDeviceMsg(''), 3000)

    // Reload the device list after kicking
    await loadDevices()
  }

  const parseDeviceInfo = (info: string) => {
    if (!info) return t('settings.unknownDevice')

    // Extract browser name and version
    const browserMatch = info.match(/(Chrome|Firefox|Safari|Edge|Opera|Brave)\/(\d+)\.[\d.]+/)
    const browser = browserMatch ? `${browserMatch[1]}/${browserMatch[2]}` : null

    // Extract OS with better patterns
    let os = null
    if (info.includes('Mac OS')) os = 'Mac OS'
    else if (info.includes('Windows NT')) os = 'Windows'
    else if (info.includes('Linux')) os = 'Linux'
    else if (info.includes('Android')) os = 'Android'
    else if (info.includes('iPhone') || info.includes('iPad')) os = 'iOS'

    // Extract mobile device info if present
    const mobileMatch = info.match(/(iPhone|iPad|Android)/)
    const mobile = mobileMatch ? mobileMatch[1] : null

    // Build display string
    const parts = []
    if (browser) parts.push(browser)
    if (os) parts.push(os)
    if (mobile && !os?.includes(mobile)) parts.push(mobile)

    return parts.length > 0 ? parts.join(' / ') : info.slice(0, 50)
  }

  const navItems: { id: Section; icon: typeof User; label: string }[] = [
    { id: 'profile', icon: User, label: t('settings.profile') },
    { id: 'security', icon: Lock, label: t('settings.security') },
    { id: 'devices', icon: Smartphone, label: t('settings.devices') },
    { id: 'theme', icon: Palette, label: t('settings.theme') },
    { id: 'language', icon: Globe, label: t('settings.language') },
    { id: 'about', icon: Info, label: t('settings.about') },
  ]

  type ThemeItem = { id: Theme; label: string; bg: string; sidebar: string; bubble: string; bubbleSelf: string; text: string; gradient?: string }

  const lightThemes: ThemeItem[] = [
    { id: 'light', label: t('settings.themeLight'), bg: '#f8fafc', sidebar: '#f1f5f9', bubble: '#e2e8f0', bubbleSelf: '#6366f1', text: '#1e293b', gradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)' },
    { id: 'light-rose', label: t('settings.themeLightRose'), bg: '#fdf2f8', sidebar: '#fce7f3', bubble: '#f9a8d4', bubbleSelf: '#db2777', text: '#1e293b', gradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(219,39,119,0.06) 0%, transparent 60%)' },
    { id: 'light-ocean', label: t('settings.themeLightOcean'), bg: '#f0f9ff', sidebar: '#e0f2fe', bubble: '#bae6fd', bubbleSelf: '#0284c7', text: '#1e293b', gradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(2,132,199,0.06) 0%, transparent 60%)' },
    { id: 'light-green', label: t('settings.themeLightGreen'), bg: '#f0fdf4', sidebar: '#dcfce7', bubble: '#bbf7d0', bubbleSelf: '#16a34a', text: '#1e293b', gradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(22,163,74,0.06) 0%, transparent 60%)' },
  ]

  const darkThemes: ThemeItem[] = [
    { id: 'dark', label: t('settings.themeDark'), bg: '#1a1a2e', sidebar: '#16162a', bubble: '#2a2a40', bubbleSelf: '#6366f1', text: '#e2e8f0', gradient: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)' },
    { id: 'midnight', label: t('settings.themeMidnight'), bg: '#0f172a', sidebar: '#0c1322', bubble: '#1e293b', bubbleSelf: '#6366f1', text: '#cbd5e1', gradient: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)' },
    { id: 'green', label: t('settings.themeGreen'), bg: '#0d1f17', sidebar: '#0a1a13', bubble: '#1a3328', bubbleSelf: '#10b981', text: '#d1fae5', gradient: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)' },
    { id: 'rose', label: t('settings.themeRose'), bg: '#1f0d18', sidebar: '#1a0a14', bubble: '#331a28', bubbleSelf: '#e11d48', text: '#fce7f3', gradient: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(225,29,72,0.12) 0%, transparent 70%)' },
    { id: 'ocean', label: t('settings.themeOcean'), bg: '#0d171f', sidebar: '#0a1319', bubble: '#1a2833', bubbleSelf: '#0ea5e9', text: '#e0f2fe', gradient: 'radial-gradient(ellipse 90% 60% at 30% 0%, rgba(14,165,233,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 10%, rgba(56,189,248,0.08) 0%, transparent 50%)' },
    { id: 'amber', label: t('settings.themeAmber'), bg: '#1a1508', sidebar: '#15110a', bubble: '#332a1a', bubbleSelf: '#f59e0b', text: '#fef3c7', gradient: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 70%)' },
    { id: 'violet', label: t('settings.themeViolet'), bg: '#180d1f', sidebar: '#140a1a', bubble: '#281a33', bubbleSelf: '#a855f7', text: '#f3e8ff', gradient: 'radial-gradient(ellipse 70% 50% at 30% 0%, rgba(168,85,247,0.12) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 75% 5%, rgba(139,92,246,0.08) 0%, transparent 45%)' },
  ]
  return (
    <div className="flex-1 flex h-full">
      {/* Left nav */}
      <div className="w-56 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t('admin.back')}
          </button>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mt-2">{t('settings.title')}</h2>
        </div>
        <nav className="flex-1 py-2 flex flex-col">
          <div className="flex-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium cursor-pointer transition-colors',
                  section === id
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-r-2 border-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--color-border)] mt-2 pt-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium cursor-pointer transition-colors text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
            >
              <LogOut className="w-4 h-4" />
              {t('sidebar.signOut')}
            </button>
          </div>
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto bg-[var(--color-bg-primary)]">
        <div className={cn('mx-auto py-8 px-6', section === 'theme' ? 'max-w-3xl' : 'max-w-lg')}>
          {section === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.profile')}</h3>

              <div className="flex items-center gap-4">
                <AvatarPicker
                  currentUrl={editAvatar || entity?.avatar_url}
                  onSelect={setEditAvatar}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">@{entity?.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{entity?.entity_type}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">{t('settings.displayName')}</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                  className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">{t('settings.email')}</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                  placeholder={t('settings.emailPlaceholder')}
                  className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="h-9 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {t('common.save')}
              </button>
              {saveMsg && <p className="text-xs text-[var(--color-success)]">{saveMsg}</p>}
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.security')}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{t('settings.changePasswordDesc')}</p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">{t('settings.currentPassword')}</label>
                  <div className="relative">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                      className="w-full h-9 px-3 pr-9 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
                    />
                    <button onClick={() => setShowOld(!showOld)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer">
                      {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">{t('settings.newPassword')}</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full h-9 px-3 pr-9 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
                    />
                    <button onClick={() => setShowNew(!showNew)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer">
                      {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">{t('settings.confirmPassword')}</label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                    className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
                  />
                </div>
              </div>

              {passError && <p className="text-xs text-[var(--color-error)]">{passError}</p>}
              {passSuccess && <p className="text-xs text-[var(--color-success)]">{passSuccess}</p>}

              <button
                onClick={handleChangePassword}
                disabled={saving || !oldPass || !newPass || !confirmPass}
                className="h-9 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                {t('settings.changePassword')}
              </button>
            </div>
          )}

          {section === 'devices' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.devices')}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{t('settings.devicesDesc')}</p>

              {devicesLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : devices.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">{t('settings.noDevices')}</p>
              ) : (
                <div className="space-y-2">
                  {devices.map((device, index) => {
                    const isCurrentDevice = device.device_id === currentDeviceId

                    return (
                      <div
                        key={`${device.device_id}-${index}`}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                          isCurrentDevice
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                            : 'border-[var(--color-border)]',
                        )}
                      >
                        <Smartphone className={cn('w-5 h-5 flex-shrink-0', isCurrentDevice ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-[var(--color-text-primary)]">
                              {parseDeviceInfo(device.device_info)}
                            </p>
                            {isCurrentDevice && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium whitespace-nowrap">
                                {t('settings.currentDevice')}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1" title={device.device_id}>
                            ID: {device.device_id.slice(0, 12)}...{device.device_id.slice(-4)}
                          </p>
                        </div>
                        {!isCurrentDevice && (
                          <button
                            onClick={() => handleKickDevice(device.device_id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 cursor-pointer transition-colors"
                          >
                            <LogOut className="w-3 h-3" />
                            {t('settings.disconnectDevice')}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {devices.length > 1 && (
                <button
                  onClick={handleKickOthers}
                  className="h-9 px-4 rounded-lg bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 text-[var(--color-error)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('settings.disconnectOthers')}
                </button>
              )}

              {deviceMsg && <p className="text-xs text-[var(--color-success)]">{deviceMsg}</p>}
            </div>
          )}

          {section === 'theme' && (
            <div className="space-y-8">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.theme')}</h3>

              {/* Light themes group */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.themeGroupLight')}</p>
                <div className="grid grid-cols-4 gap-3">
                  {lightThemes.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setTheme(th.id)}
                      className={cn(
                        'relative h-28 rounded-xl border-2 cursor-pointer transition-all overflow-hidden',
                        theme === th.id
                          ? 'border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-[1.02]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:scale-[1.01]',
                      )}
                    >
                      <div className="absolute inset-0 flex" style={{ background: th.gradient ? `${th.gradient}, ${th.bg}` : th.bg }}>
                        <div className="w-4 h-full flex flex-col items-center gap-1 py-2" style={{ background: th.sidebar }}>
                          <div className="w-2 h-2 rounded" style={{ background: th.bubbleSelf }} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: th.bubble }} />
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-1.5 px-1.5 py-2">
                          <div className="flex justify-start">
                            <div className="h-2 rounded-full" style={{ background: th.bubble, width: '60%' }} />
                          </div>
                          <div className="flex justify-end">
                            <div className="h-2 rounded-full" style={{ background: th.bubbleSelf, width: '45%' }} />
                          </div>
                          <div className="flex justify-start">
                            <div className="h-2 rounded-full" style={{ background: th.bubble, width: '50%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="relative flex items-end justify-between p-2.5 h-full">
                        <span className="text-[11px] font-semibold drop-shadow-sm" style={{ color: th.text }}>{th.label}</span>
                        {theme === th.id && (
                          <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark themes group */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.themeGroupDark')}</p>
                <div className="grid grid-cols-4 gap-3">
                  {darkThemes.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setTheme(th.id)}
                      className={cn(
                        'relative h-28 rounded-xl border-2 cursor-pointer transition-all overflow-hidden',
                        theme === th.id
                          ? 'border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-[1.02]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:scale-[1.01]',
                      )}
                    >
                      <div className="absolute inset-0 flex" style={{ background: th.gradient ? `${th.gradient}, ${th.bg}` : th.bg }}>
                        <div className="w-4 h-full flex flex-col items-center gap-1 py-2" style={{ background: th.sidebar }}>
                          <div className="w-2 h-2 rounded" style={{ background: th.bubbleSelf }} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: th.bubble }} />
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-1.5 px-1.5 py-2">
                          <div className="flex justify-start">
                            <div className="h-2 rounded-full" style={{ background: th.bubble, width: '60%' }} />
                          </div>
                          <div className="flex justify-end">
                            <div className="h-2 rounded-full" style={{ background: th.bubbleSelf, width: '45%' }} />
                          </div>
                          <div className="flex justify-start">
                            <div className="h-2 rounded-full" style={{ background: th.bubble, width: '50%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="relative flex items-end justify-between p-2.5 h-full">
                        <span className="text-[11px] font-semibold drop-shadow-sm" style={{ color: th.text }}>{th.label}</span>
                        {theme === th.id && (
                          <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'language' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.language')}</h3>
              <div className="space-y-2">
                {([
                  { id: 'en' as Locale, label: 'English', desc: 'English (US)' },
                  { id: 'zh-CN' as Locale, label: '中文', desc: '简体中文' },
                ]).map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => { setLocale(id); i18n.changeLanguage(id) }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all',
                      locale === id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]',
                    )}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{desc}</p>
                    </div>
                    {locale === id && <Check className="w-4 h-4 text-[var(--color-accent)]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === 'about' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.about')}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{t('settings.aboutDesc')}</p>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">{t('settings.appName')}</span>
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">Agent-Native IM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">{t('settings.version')}</span>
                  <code className="text-xs text-[var(--color-text-primary)]">{buildInfo.version}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">{t('settings.commit')}</span>
                  <code className="text-xs text-[var(--color-text-primary)]">{buildInfo.commit}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">{t('settings.buildTime')}</span>
                  <span className="text-xs text-[var(--color-text-primary)]">{new Date(buildInfo.buildTime).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText([
                      `app=Agent-Native IM`,
                      `version=${buildInfo.version}`,
                      `commit=${buildInfo.commit}`,
                      `build_time=${buildInfo.buildTime}`,
                    ].join('\n'))
                    setAboutCopied(true)
                    setTimeout(() => setAboutCopied(false), 2000)
                  } catch {
                    setAboutCopied(false)
                  }
                }}
                className="h-9 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {t('settings.copyVersionInfo')}
              </button>
              {aboutCopied && <p className="text-xs text-[var(--color-success)]">{t('common.copied')}</p>}

              {/* PWA Install — remove when migrating to React Native */}
              <div className="border-t border-[var(--color-border)] pt-6 mt-6 space-y-3">
                {canInstall && (
                  <>
                    <p className="text-xs text-[var(--color-text-muted)]">{t('pwa.installDescription')}</p>
                    <button
                      onClick={promptInstall}
                      className="h-9 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('pwa.installApp')}
                    </button>
                  </>
                )}
                {isInstalled && (
                  <p className="text-xs text-[var(--color-success)]">{t('pwa.installed')}</p>
                )}
                {!canInstall && !isInstalled && isIos && (
                  <p className="text-xs text-[var(--color-text-muted)]">{t('pwa.iosInstallHint')}</p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
