/**
 * Layout Inspector — captures element hierarchy layout data for debugging.
 * Designed to be pasted into AI assistants for layout issue diagnosis.
 *
 * Usage:
 *   import { inspectChatBubbles, copyToClipboard } from '@/lib/layout-inspector'
 *   const report = inspectChatBubbles('chat-message-list')
 *   await copyToClipboard(report)
 */

/** Collect computed style properties relevant to layout */
function getLayoutProps(el: HTMLElement) {
  const cs = window.getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return {
    width: Math.round(r.width),
    height: Math.round(r.height),
    left: Math.round(r.left),
    right: Math.round(r.right),
    top: Math.round(r.top),
    bottom: Math.round(r.bottom),
    display: cs.display,
    flex: cs.flex,
    flexDirection: cs.flexDirection,
    alignItems: cs.alignItems,
    alignSelf: cs.alignSelf,
    justifyContent: cs.justifyContent,
    maxWidth: cs.maxWidth,
    minWidth: cs.minWidth,
    padding: cs.padding,
    margin: cs.margin,
    overflow: cs.overflow,
    boxSizing: cs.boxSizing,
    position: cs.position,
  }
}

/**
 * Inspect a single element and its children up to maxDepth.
 * Returns a markdown-formatted string describing the layout hierarchy.
 */
export function inspectElement(el: HTMLElement, maxDepth = 10): string {
  const lines: string[] = []

  function walk(node: HTMLElement, depth: number) {
    if (depth > maxDepth) return
    const p = getLayoutProps(node)
    const cls = (node.className && typeof node.className === 'string')
      ? node.className.slice(0, 80)
      : node.tagName.toLowerCase()
    const indent = '  '.repeat(depth)
    lines.push(
      `${indent}L${depth}: w=${p.width} h=${p.height} ` +
      `display=${p.display} flex=${p.flex} ` +
      `maxW=${p.maxWidth} minW=${p.minWidth} ` +
      `alignItems=${p.alignItems} alignSelf=${p.alignSelf} ` +
      `cls="${cls}"`
    )

    const children = node.children
    for (let i = 0; i < Math.min(children.length, 10); i++) {
      const child = children[i] as HTMLElement
      if (child.nodeType === 1) {
        walk(child, depth + 1)
      }
    }
  }

  walk(el, 0)
  return lines.join('\n')
}

interface BubbleInfo {
  index: number
  type: 'SELF' | 'OTHER'
  rowWidth: number
  bubbleWidth: number
  gapLeft: number
  gapRight: number
  overflow: boolean
}

/**
 * Inspect all chat bubbles inside a container element.
 * Returns a full markdown-formatted layout debug report.
 */
export function inspectChatBubbles(containerId: string): string {
  const container = document.getElementById(containerId)
  if (!container) {
    return `Error: element #${containerId} not found`
  }

  const containerRect = container.getBoundingClientRect()
  const containerCs = window.getComputedStyle(container)
  const screen = { w: window.innerWidth, h: window.innerHeight }

  // Find all message rows (they have gap-2 and group classes)
  const allDivs = container.querySelectorAll('div')
  const rows = Array.from(allDivs).filter(d =>
    typeof d.className === 'string' &&
    d.className.includes('group') &&
    d.className.includes('gap-2') &&
    d.className.includes('transition-opacity')
  )

  const bubbles: BubbleInfo[] = rows.map((row, i) => {
    const r = row.getBoundingClientRect()
    const isSelf = row.className.includes('ml-auto')
    const bubbleEl = row.querySelector('[class*="rounded-2xl"]')
    const br = bubbleEl?.getBoundingClientRect()
    const bubbleWidth = br ? Math.round(br.width) : 0
    const gapLeft = br ? Math.round(br.left - containerRect.left) : 0
    const gapRight = br ? Math.round(containerRect.right - br.right) : 0
    const overflow = br ? (br.right > containerRect.right + 1 || br.left < containerRect.left - 1) : false

    return {
      index: i,
      type: isSelf ? 'SELF' : 'OTHER',
      rowWidth: Math.round(r.width),
      bubbleWidth,
      gapLeft,
      gapRight,
      overflow,
    }
  })

  // Build report
  const lines: string[] = []
  lines.push('## Layout Debug Report')
  lines.push(`Container: ${Math.round(containerRect.width)}x${Math.round(containerRect.height)}, padding: ${containerCs.padding}`)
  lines.push(`Screen: ${screen.w}x${screen.h}`)
  lines.push('')
  lines.push(`### Bubbles (${bubbles.length} total)`)
  lines.push('| # | Type | Row W | Bubble W | Gap L | Gap R | Overflow |')
  lines.push('|---|------|-------|----------|-------|-------|----------|')

  for (const b of bubbles) {
    lines.push(
      `| ${b.index} | ${b.type} | ${b.rowWidth} | ${b.bubbleWidth} | ${b.gapLeft} | ${b.gapRight} | ${b.overflow ? 'YES' : '-'} |`
    )
  }

  // DOM trace for first OTHER bubble
  const firstOther = rows.find(r => !r.className.includes('ml-auto'))
  if (firstOther) {
    lines.push('')
    lines.push('### DOM Trace (first OTHER)')
    let el: HTMLElement | null = firstOther as HTMLElement
    let depth = 0
    while (el && el !== container && depth < 10) {
      const p = getLayoutProps(el)
      const cls = (el.className && typeof el.className === 'string')
        ? el.className.slice(0, 80)
        : el.tagName.toLowerCase()
      lines.push(
        `L${depth}: w=${p.width} display=${p.display} flex=${p.flex} ` +
        `maxW=${p.maxWidth} alignSelf=${p.alignSelf} cls="${cls}"`
      )
      depth++
      // Navigate into content column (typically 2nd child for OTHER bubbles)
      if (el.children.length > 1) {
        el = el.children[1] as HTMLElement
      } else if (el.children.length === 1) {
        el = el.children[0] as HTMLElement
      } else {
        break
      }
    }
  }

  // DOM trace for first SELF bubble
  const firstSelf = rows.find(r => r.className.includes('ml-auto'))
  if (firstSelf) {
    lines.push('')
    lines.push('### DOM Trace (first SELF)')
    let el: HTMLElement | null = firstSelf as HTMLElement
    let depth = 0
    while (el && el !== container && depth < 10) {
      const p = getLayoutProps(el)
      const cls = (el.className && typeof el.className === 'string')
        ? el.className.slice(0, 80)
        : el.tagName.toLowerCase()
      lines.push(
        `L${depth}: w=${p.width} display=${p.display} flex=${p.flex} ` +
        `maxW=${p.maxWidth} alignSelf=${p.alignSelf} cls="${cls}"`
      )
      depth++
      if (el.children.length > 1) {
        el = el.children[1] as HTMLElement
      } else if (el.children.length === 1) {
        el = el.children[0] as HTMLElement
      } else {
        break
      }
    }
  }

  return lines.join('\n')
}

/**
 * Copy text to clipboard. Returns true on success.
 * Falls back to execCommand for non-HTTPS contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback for HTTP / older browsers
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
