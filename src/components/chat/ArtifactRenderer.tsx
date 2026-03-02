import { useState, useEffect, useId, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'
import {
  Copy, Check, Maximize2, Minimize2, Code2, ChevronDown, ChevronUp,
  FileCode, Image as ImageIcon, GitBranch, Globe,
} from 'lucide-react'

interface ArtifactProps {
  artifactType: string   // 'html' | 'code' | 'mermaid' | 'image'
  source: string
  title?: string
  language?: string
  height?: number
}

// ─── Type icon helper ──────────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'html':    return <Globe className="w-3.5 h-3.5" />
    case 'code':    return <FileCode className="w-3.5 h-3.5" />
    case 'mermaid': return <GitBranch className="w-3.5 h-3.5" />
    case 'image':   return <ImageIcon className="w-3.5 h-3.5" />
    default:        return <Code2 className="w-3.5 h-3.5" />
  }
}

// ─── Copy button ───────────────────────────────────────────────
function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-3 h-3'
  return (
    <button
      onClick={handleCopy}
      className="w-7 h-7 rounded-md hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors"
      title="Copy source"
    >
      {copied
        ? <Check className={cn(iconClass, 'text-[var(--color-success)]')} />
        : <Copy className={cn(iconClass, 'text-[var(--color-text-muted)]')} />
      }
    </button>
  )
}

// ─── HTML Renderer ─────────────────────────────────────────────
function HtmlRenderer({ source, height }: { source: string; height: number }) {
  return (
    <iframe
      sandbox="allow-scripts"
      srcDoc={source}
      style={{ height: `${height}px` }}
      className="w-full rounded-b-lg border-0 bg-white"
    />
  )
}

// ─── Code Renderer ─────────────────────────────────────────────
function CodeRenderer({ source, language }: { source: string; language: string }) {
  const fenced = `\`\`\`${language}\n${source}\n\`\`\``
  return (
    <div className="md artifact-code">
      {language && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]">
          <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {language}
          </span>
          <CopyButton text={source} size="xs" />
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {fenced}
      </ReactMarkdown>
    </div>
  )
}

// ─── Mermaid Renderer ──────────────────────────────────────────
function MermaidRenderer({ source }: { source: string }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const id = useId().replace(/:/g, '-')

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ theme: 'dark', startOnLoad: false })
        const { svg: rendered } = await mermaid.render(`mermaid${id}`, source)
        if (!cancelled) setSvg(rendered)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Mermaid render failed')
      }
    }
    render()
    return () => { cancelled = true }
  }, [source, id])

  if (error) {
    return (
      <div className="p-3 space-y-2">
        <p className="text-[11px] text-[var(--color-error)]">Failed to render diagram</p>
        <pre className="text-[11px] text-[var(--color-text-muted)] whitespace-pre-wrap font-mono">{source}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="p-4 flex items-center justify-center text-[var(--color-text-muted)] text-xs">
        Rendering diagram...
      </div>
    )
  }

  return (
    <div
      className="p-3 flex justify-center overflow-auto artifact-mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ─── Image Renderer ────────────────────────────────────────────
function ImageRenderer({ source, title, fullscreen }: { source: string; title?: string; fullscreen?: boolean }) {
  return (
    <div className={cn('p-3 flex justify-center', fullscreen && 'items-center h-full')}>
      <img
        src={source}
        alt={title || 'artifact image'}
        className={cn(
          'max-w-full rounded-lg cursor-pointer object-contain',
          fullscreen ? 'max-h-full' : 'max-h-[400px]',
        )}
        loading="lazy"
        onClick={() => window.open(source, '_blank')}
      />
    </div>
  )
}

// ─── Main ArtifactRenderer ─────────────────────────────────────
export function ArtifactRenderer({ artifactType, source, title, language = '', height = 300 }: ArtifactProps) {
  const [showSource, setShowSource] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const displayTitle = title || {
    html: 'HTML Content',
    code: language ? `${language} Code` : 'Code',
    mermaid: 'Diagram',
    image: 'Image',
  }[artifactType] || 'Artifact'

  const renderContent = () => {
    switch (artifactType) {
      case 'html':
        return <HtmlRenderer source={source} height={height} />
      case 'code':
        return <CodeRenderer source={source} language={language} />
      case 'mermaid':
        return <MermaidRenderer source={source} />
      case 'image':
        return <ImageRenderer source={source} title={title} fullscreen={fullscreen} />
      default:
        return (
          <pre className="p-3 text-xs text-[var(--color-text-muted)] whitespace-pre-wrap font-mono overflow-auto max-h-[300px]">
            {source}
          </pre>
        )
    }
  }

  const content = (
    <div className={cn(
      'artifact-container rounded-xl border border-[var(--color-border)] overflow-hidden',
      fullscreen && 'fixed inset-4 z-50 bg-[var(--color-bg-primary)] shadow-2xl shadow-black/50 flex flex-col',
    )}>
      {/* Header */}
      <div className="artifact-header flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
        <TypeIcon type={artifactType} />
        <span className="text-xs font-medium text-[var(--color-text-secondary)] flex-1 truncate">
          {displayTitle}
        </span>
        <div className="flex items-center gap-0.5">
          <CopyButton text={source} />
          {(artifactType === 'html' || artifactType === 'mermaid' || artifactType === 'image') && (
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="w-7 h-7 rounded-md hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen
                ? <Minimize2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                : <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              }
            </button>
          )}
          <button
            onClick={() => setShowSource(!showSource)}
            className="w-7 h-7 rounded-md hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors"
            title={showSource ? 'Hide source' : 'View source'}
          >
            <Code2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn(fullscreen && 'flex-1 overflow-auto')}>
        {renderContent()}
      </div>

      {/* Source view (collapsible) */}
      {showSource && artifactType !== 'code' && (
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={() => setShowSource(false)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            <span>Hide Source</span>
          </button>
          <pre className="px-3 pb-3 text-[11px] text-[var(--color-text-muted)] whitespace-pre-wrap font-mono overflow-auto max-h-[200px] leading-relaxed">
            {source.length > 500000 ? source.slice(0, 500000) + '\n... (truncated)' : source}
          </pre>
        </div>
      )}
    </div>
  )

  // Fullscreen backdrop
  if (fullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setFullscreen(false)} />
        {content}
      </>
    )
  }

  return content
}
