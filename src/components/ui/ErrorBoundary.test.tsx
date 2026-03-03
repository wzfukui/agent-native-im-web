import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// Mock i18n module
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.errorTitle': 'Something went wrong',
        'common.errorUnexpected': 'An unexpected error occurred',
        'common.reload': 'Reload',
      }
      return translations[key] || key
    },
  },
}))

// Suppress console.error for expected errors
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>Child rendered OK</div>
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Safe content')).toBeTruthy()
  })

  it('shows fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Test error')).toBeTruthy()
  })

  it('shows default message when error has no message', () => {
    function NoMsgError(): React.ReactNode {
      throw Object.assign(new Error(), { message: '' })
    }
    render(
      <ErrorBoundary>
        <NoMsgError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('An unexpected error occurred')).toBeTruthy()
  })

  it('uses custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error page</div>}>
        <ProblemChild shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Custom error page')).toBeTruthy()
  })

  it('recovers from error when Reload is clicked', () => {
    let shouldThrow = true
    function MaybeError() {
      if (shouldThrow) throw new Error('Boom')
      return <div>Recovered!</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()

    // Stop throwing and click reload
    shouldThrow = false
    fireEvent.click(screen.getByText('Reload'))

    // After reset, the component should attempt to render children again
    rerender(
      <ErrorBoundary>
        <MaybeError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Recovered!')).toBeTruthy()
  })
})
