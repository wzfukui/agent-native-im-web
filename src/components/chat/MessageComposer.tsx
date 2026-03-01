import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, X, Image as ImageIcon, FileText, AtSign } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

interface Props {
  onSend: (text: string, attachments?: File[], mentions?: number[]) => void
  onFileUpload?: (file: File) => Promise<string | null>
  disabled?: boolean
  placeholder?: string
}

export function MessageComposer({ onSend, onFileUpload, disabled, placeholder }: Props) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    onSend(trimmed, files.length > 0 ? files : undefined)
    setText('')
    setFiles([])
    textareaRef.current?.focus()
  }, [text, files, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    setText(ta.value)
  }

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Attached files preview */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              )}
              <span className="text-[var(--color-text-secondary)] max-w-[100px] truncate">{file.name}</span>
              <span className="text-[var(--color-text-muted)]">{formatFileSize(file.size)}</span>
              <button onClick={() => removeFile(i)} className="cursor-pointer hover:text-[var(--color-error)] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus-within:border-[var(--color-accent)]/50 transition-colors">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={autoResize}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type a message...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none leading-relaxed max-h-[120px] py-1"
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && files.length === 0)}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
            text.trim() || files.length > 0
              ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-sm shadow-[var(--color-accent)]/25'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]',
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
