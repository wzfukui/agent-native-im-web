import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ open, onClose, children, className }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const startYRef = useRef(0)
  const currentYRef = useRef(0)
  const isDraggingRef = useRef(false)

  // Animation sequencing: open -> mount -> animate-in, close -> animate-out -> unmount
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setVisible(true)
        requestAnimationFrame(() => setAnimating(true))
      })
    } else {
      queueMicrotask(() => setAnimating(false))
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Drag handle logic
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    isDraggingRef.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !sheetRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) {
      currentYRef.current = delta
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
    if (!sheetRef.current) return
    if (currentYRef.current > 100) {
      onClose()
    } else {
      sheetRef.current.style.transform = ''
    }
    currentYRef.current = 0
  }, [onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          animating ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-lg bg-[var(--color-bg-secondary)] rounded-t-2xl shadow-2xl shadow-black/30 transition-transform duration-300 ease-out max-h-[85vh] flex flex-col',
          animating ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab">
          <div className="w-10 h-1 rounded-full bg-[var(--color-text-muted)]/30" />
        </div>

        {children}
      </div>
    </div>
  )
}
