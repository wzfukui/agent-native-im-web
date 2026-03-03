import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Upload, Loader2, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'

// Preset bot avatar colors/emojis for quick selection
const PRESET_AVATARS = [
  '🤖', '🧠', '⚡', '🔮', '🎯', '🛡️', '📊', '💬',
  '🔧', '📋', '🎨', '🔍', '📝', '🚀', '💡', '🌐',
]

interface Props {
  currentUrl?: string
  onSelect: (url: string) => void
  size?: 'sm' | 'md'
}

function generatePresetSvg(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="50" fill="%23374151"/>
    <text x="50" y="58" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function AvatarPicker({ currentUrl, onSelect, size = 'md' }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [uploading, setUploading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate file type and size
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return // 5MB max

    setUploading(true)
    try {
      const res = await api.uploadFile(token, file)
      if (res.ok && res.data?.url) {
        onSelect(res.data.url)
        setShowPicker(false)
      }
    } catch { /* ignore */ }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePresetSelect = (emoji: string) => {
    const url = generatePresetSvg(emoji)
    onSelect(url)
    setShowPicker(false)
  }

  const sizeClasses = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          sizeClasses,
          'rounded-full border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] flex items-center justify-center cursor-pointer transition-colors overflow-hidden group',
        )}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="" className="w-full h-full rounded-full object-cover" />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className={cn(iconSize, 'text-white')} />
            </div>
          </>
        ) : (
          <Camera className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
        )}
      </button>

      {showPicker && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">{t('bot.avatar')}</span>
            <button onClick={() => setShowPicker(false)} className="cursor-pointer">
              <X className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
          </div>

          {/* Upload button */}
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-1.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[11px] text-[var(--color-text-secondary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {t('bot.uploadAvatar')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preset grid */}
          <div className="px-3 py-2">
            <div className="grid grid-cols-8 gap-1">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handlePresetSelect(emoji)}
                  className="w-6 h-6 rounded-md hover:bg-[var(--color-bg-hover)] flex items-center justify-center text-sm cursor-pointer transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
