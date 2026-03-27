export function normalizeSelectedMessageText(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

function serializeSelectedNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as HTMLElement
  if (element.tagName === 'BR') return '\n'

  const childText = Array.from(element.childNodes).map(serializeSelectedNode).join('')

  if (['P', 'DIV', 'LI', 'TR', 'BLOCKQUOTE', 'PRE'].includes(element.tagName)) {
    return `${childText}\n`
  }

  return childText
}

export function getSelectedMessageCopyText(container: HTMLElement): string | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const { anchorNode, focusNode } = selection
  if (!anchorNode || !focusNode) return null
  if (!container.contains(anchorNode) || !container.contains(focusNode)) return null

  const wrapper = document.createElement('div')
  for (let i = 0; i < selection.rangeCount; i += 1) {
    wrapper.appendChild(selection.getRangeAt(i).cloneContents())
  }

  const text = normalizeSelectedMessageText(
    Array.from(wrapper.childNodes).map(serializeSelectedNode).join(''),
  ).replace(/\n$/, '')
  return text || null
}
