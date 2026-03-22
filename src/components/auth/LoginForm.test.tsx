import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LoginForm } from './LoginForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('LoginForm', () => {
  it('renders offline hint when provided', () => {
    render(
      <LoginForm
        onLogin={vi.fn(async () => {})}
        offlineHint="First-time sign-in still needs a live connection."
      />,
    )

    expect(screen.getByText('First-time sign-in still needs a live connection.')).toBeInTheDocument()
  })
})
