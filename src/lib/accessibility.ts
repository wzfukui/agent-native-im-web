/**
 * Accessibility utilities and keyboard navigation helpers
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Keyboard shortcut definitions
 */
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  FOCUS_SEARCH: 'cmd+k,ctrl+k',
  SWITCH_TAB_1: 'cmd+1,ctrl+1',
  SWITCH_TAB_2: 'cmd+2,ctrl+2',
  SWITCH_TAB_3: 'cmd+3,ctrl+3',
  NEXT_CONVERSATION: 'cmd+],ctrl+]',
  PREV_CONVERSATION: 'cmd+[,ctrl+[',

  // Messages
  SEND_MESSAGE: 'cmd+enter,ctrl+enter',
  NEW_LINE: 'shift+enter',
  EDIT_LAST_MESSAGE: 'ArrowUp',
  CANCEL_EDIT: 'Escape',

  // Actions
  NEW_CONVERSATION: 'cmd+n,ctrl+n',
  ARCHIVE_CONVERSATION: 'cmd+e,ctrl+e',
  DELETE_MESSAGE: 'cmd+d,ctrl+d',
  TOGGLE_SIDEBAR: 'cmd+b,ctrl+b',
  TOGGLE_THEME: 'cmd+shift+l,ctrl+shift+l',

  // Accessibility
  ANNOUNCE_STATUS: 'cmd+shift+a,ctrl+shift+a',
  SKIP_TO_CONTENT: 'alt+c',
  SKIP_TO_NAVIGATION: 'alt+n'
} as const

/**
 * Parse keyboard shortcut string
 */
function parseShortcut(shortcut: string) {
  const parts = shortcut.toLowerCase().split('+')
  return {
    key: parts[parts.length - 1],
    ctrlKey: parts.includes('ctrl'),
    cmdKey: parts.includes('cmd'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt')
  }
}

/**
 * Check if keyboard event matches shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcuts: string): boolean {
  const shortcutList = shortcuts.split(',')

  for (const shortcut of shortcutList) {
    const parsed = parseShortcut(shortcut)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    const metaKey = isMac ? event.metaKey : event.ctrlKey
    const ctrlKey = !isMac && event.ctrlKey

    if (
      parsed.key === event.key.toLowerCase() &&
      parsed.shiftKey === event.shiftKey &&
      parsed.altKey === event.altKey &&
      ((parsed.cmdKey && metaKey) || (parsed.ctrlKey && ctrlKey))
    ) {
      return true
    }
  }

  return false
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcut(
  shortcuts: string,
  handler: (event: KeyboardEvent) => void,
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcuts)) {
        event.preventDefault()
        handlerRef.current(event)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, ...deps])
}

/**
 * Focus trap hook for modals and dialogs
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive = true) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, isActive])
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Generate unique ID for ARIA attributes
 */
let idCounter = 0
export function generateAriaId(prefix: string): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Keyboard navigation manager for lists
 */
export function useListKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  onAction?: (index: number, action: 'enter' | 'space' | 'delete') => void
) {
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((prev: number) => Math.min(prev + 1, itemCount - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((prev: number) => Math.max(prev - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedIndex(itemCount - 1)
        break
      case 'Enter':
        if (focusedIndex >= 0) {
          onSelect(focusedIndex)
          onAction?.(focusedIndex, 'enter')
        }
        break
      case ' ':
        if (focusedIndex >= 0) {
          event.preventDefault()
          onAction?.(focusedIndex, 'space')
        }
        break
      case 'Delete':
      case 'Backspace':
        if (focusedIndex >= 0) {
          onAction?.(focusedIndex, 'delete')
        }
        break
    }
  }, [focusedIndex, itemCount, onSelect, onAction])

  return { focusedIndex, setFocusedIndex, handleKeyDown }
}

/**
 * Focus visible manager
 */
export function useFocusVisible() {
  useEffect(() => {
    // Add focus-visible class when keyboard navigation is detected
    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigating')
      }
    }

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigating')
    }

    document.addEventListener('keydown', handleFirstTab)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleFirstTab)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])
}