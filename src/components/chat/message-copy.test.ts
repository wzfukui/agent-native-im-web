import { describe, expect, it } from 'vitest'
import { getSelectedMessageCopyText } from './message-copy'

function selectNodeContents(node: Node) {
  const range = document.createRange()
  range.selectNodeContents(node)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

describe('getSelectedMessageCopyText', () => {
  it('preserves explicit newlines in plain text content', () => {
    document.body.innerHTML = '<div id="root"><p>one\ntwo</p></div>'
    const root = document.getElementById('root') as HTMLElement
    const paragraph = root.querySelector('p') as HTMLElement
    selectNodeContents(paragraph)
    expect(getSelectedMessageCopyText(root)).toBe('one\ntwo')
  })

  it('uses fragment text content so markdown paragraphs do not gain extra blank lines', () => {
    document.body.innerHTML = '<div id="root"><div class="md"><p>hello</p><p>world</p></div></div>'
    const root = document.getElementById('root') as HTMLElement
    const markdown = root.querySelector('.md') as HTMLElement
    selectNodeContents(markdown)
    expect(getSelectedMessageCopyText(root)).toBe('hello\nworld')
  })

  it('keeps list items on separate lines without adding blank paragraphs', () => {
    document.body.innerHTML = '<div id="root"><div class="md"><p>intro</p><ul><li>one</li><li>two</li></ul><p>tail</p></div></div>'
    const root = document.getElementById('root') as HTMLElement
    const markdown = root.querySelector('.md') as HTMLElement
    selectNodeContents(markdown)
    expect(getSelectedMessageCopyText(root)).toBe('intro\none\ntwo\ntail')
  })

  it('returns null when selection is outside the message container', () => {
    document.body.innerHTML = '<div id="root"><p>inside</p></div><p id="outside">outside</p>'
    const root = document.getElementById('root') as HTMLElement
    const outside = document.getElementById('outside') as HTMLElement
    selectNodeContents(outside)
    expect(getSelectedMessageCopyText(root)).toBeNull()
  })
})
