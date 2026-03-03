import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
      }
      return translations[key] || key
    },
  }),
}))

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete item?',
    message: 'This cannot be undone.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title and message when open', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Delete item?')).toBeTruthy()
    expect(screen.getByText('This cannot be undone.')).toBeTruthy()
  })

  it('uses default button labels from i18n', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Cancel')).toBeTruthy()
    expect(screen.getByText('Confirm')).toBeTruthy()
  })

  it('uses custom button labels when provided', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Yes, delete" cancelLabel="No" />)
    expect(screen.getByText('Yes, delete')).toBeTruthy()
    expect(screen.getByText('No')).toBeTruthy()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    // Click on the backdrop (outermost fixed div)
    fireEvent.click(container.firstChild as Element)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onCancel when dialog content is clicked (stopPropagation)', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Delete item?'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('applies danger variant styling to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />)
    const confirmBtn = screen.getByText('Confirm')
    expect(confirmBtn.className).toContain('bg-[var(--color-error)]')
  })

  it('applies default variant styling to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} variant="default" />)
    const confirmBtn = screen.getByText('Confirm')
    expect(confirmBtn.className).toContain('bg-[var(--color-accent)]')
  })
})
