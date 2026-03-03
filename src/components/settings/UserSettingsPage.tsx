import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore, type Theme, type Locale } from '@/store/settings'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { AvatarPicker } from '@/components/entity/AvatarPicker'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api'
import {
  User, Lock, Palette, Globe, ChevronLeft,
  Check, Loader2, Eye, EyeOff, Smartphone, LogOut,
} from 'lucide-react'

type Section = 'profile' | 'security' | 'devices' | 'theme' | 'language'

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

  const handleSaveProfile = async () => {
    if (!editName.trim() || !entity) return
    setSaving(true)
    setSaveMsg('')
    const updateData: { display_name?: string; avatar_url?: string } = {
      display_name: editName.trim()
    }
    if (editAvatar && editAvatar !== entity.avatar_url) {
      updateData.avatar_url = editAvatar
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
    const res = await api.listDevices(token)
    if (res.ok && res.data?.devices) {
      setDevices(res.data.devices)
    }
    setDevicesLoading(false)
  }, [token])

  useEffect(() => {
    if (section === 'devices') loadDevices()
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
    let failed = 0
    for (const d of others) {
      const res = await api.kickDevice(token, d.device_id)
      if (!res.ok) failed++
    }
    if (failed > 0) {
      setDeviceMsg(t('settings.deviceDisconnectedPartial', { failed }))
    } else {
      setDeviceMsg(t('settings.deviceDisconnected'))
    }
    setTimeout(() => setDeviceMsg(''), 2000)
    loadDevices()
  }

  const parseDeviceInfo = (info: string) => {
    if (!info) return t('settings.unknownDevice')
    // Extract browser + OS from User-Agent
    const match = info.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)
    const os = info.match(/(Windows|Mac OS|Linux|Android|iOS)/)
    return [match?.[0], os?.[0]].filter(Boolean).join(' / ') || info.slice(0, 40)
  }

  const navItems: { id: Section; icon: typeof User; label: string }[] = [
    { id: 'profile', icon: User, label: t('settings.profile') },
    { id: 'security', icon: Lock, label: t('settings.security') },
    { id: 'devices', icon: Smartphone, label: t('settings.devices') },
    { id: 'theme', icon: Palette, label: t('settings.theme') },
    { id: 'language', icon: Globe, label: t('settings.language') },
  ]

  const themes: { id: Theme; label: string; colors: string }[] = [
    { id: 'dark', label: t('settings.themeDark'), colors: 'from-gray-800 to-gray-900' },
    { id: 'midnight', label: t('settings.themeMidnight'), colors: 'from-slate-800 to-indigo-950' },
    { id: 'light', label: t('settings.themeLight'), colors: 'from-gray-100 to-white' },
    { id: 'green', label: t('settings.themeGreen'), colors: 'from-emerald-900 to-gray-900' },
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
        <nav className="flex-1 py-2">
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
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto bg-[var(--color-bg-primary)]">
        <div className="max-w-lg mx-auto py-8 px-6">
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

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || !editName.trim()}
                  className="h-9 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t('common.save')}
                </button>
                <button
                  onClick={logout}
                  className="h-9 px-4 rounded-lg bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)]/20 text-[var(--color-danger)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('sidebar.signOut')}
                </button>
              </div>
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
                  {devices.map((device) => {
                    const isCurrent = device.device_id === currentDeviceId
                    return (
                      <div
                        key={device.device_id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                          isCurrent
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                            : 'border-[var(--color-border)]',
                        )}
                      >
                        <Smartphone className={cn('w-5 h-5 flex-shrink-0', isCurrent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                            {parseDeviceInfo(device.device_info)}
                            {isCurrent && (
                              <span className="ml-2 text-[10px] text-[var(--color-accent)] font-normal">
                                {t('settings.thisDevice')}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                            {device.device_id.slice(0, 8)}...
                          </p>
                        </div>
                        {!isCurrent && (
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
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.theme')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className={cn(
                      'relative h-24 rounded-xl border-2 cursor-pointer transition-all overflow-hidden',
                      theme === th.id
                        ? 'border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20'
                        : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]',
                    )}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-br', th.colors)} />
                    <div className="relative flex items-end justify-between p-3 h-full">
                      <span className="text-xs font-medium text-white drop-shadow-sm">{th.label}</span>
                      {theme === th.id && (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
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
        </div>
      </div>
    </div>
  )
}
