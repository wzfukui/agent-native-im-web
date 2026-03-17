import { useEffect, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  url: string
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ url, alt = 'image', onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const scale = useRef(1)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })
  const currentPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(0.5, scale.current + delta), 3)
    scale.current = newScale
    if (imgRef.current) {
      imgRef.current.style.transform = `scale(${newScale}) translate(${currentPos.current.x}px, ${currentPos.current.y}px)`
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === imgRef.current) {
      isDraggingRef.current = true
      setIsDragging(true)
      startPos.current = { x: e.clientX - currentPos.current.x, y: e.clientY - currentPos.current.y }
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && imgRef.current) {
      currentPos.current = { x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y }
      imgRef.current.style.transform = `scale(${scale.current}) translate(${currentPos.current.x}px, ${currentPos.current.y}px)`
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    scale.current = Math.min(scale.current + 0.25, 3)
    if (imgRef.current) {
      imgRef.current.style.transform = `scale(${scale.current}) translate(${currentPos.current.x}px, ${currentPos.current.y}px)`
    }
  }

  const handleZoomOut = () => {
    scale.current = Math.max(scale.current - 0.25, 0.5)
    if (imgRef.current) {
      imgRef.current.style.transform = `scale(${scale.current}) translate(${currentPos.current.x}px, ${currentPos.current.y}px)`
    }
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-pointer"
      onClick={handleBackgroundClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <img
        ref={imgRef}
        src={url}
        alt={alt}
        className={cn(
          'max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-200',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        draggable={false}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ userSelect: 'none' }}
      />
    </div>
  )
}