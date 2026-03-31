/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { ConfirmDialog } from '../confirm-dialog'

afterEach(() => {
  cleanup()
})

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Test Dialog',
  }

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <ConfirmDialog {...defaultProps} isOpen={false} />
      )
      // Should not render any dialog content
      expect(container.textContent).toBe('')
    })

    it('renders title when open', async () => {
      const { findByText } = render(<ConfirmDialog {...defaultProps} />)
      expect(await findByText('Test Dialog')).toBeDefined()
    })

    it('renders description when provided', async () => {
      const { findByText } = render(
        <ConfirmDialog {...defaultProps} description="Test description text" />
      )
      expect(await findByText('Test description text')).toBeDefined()
    })
  })

  describe('buttons', () => {
    it('renders default confirm label', async () => {
      const { findByText } = render(<ConfirmDialog {...defaultProps} />)
      expect(await findByText('Confirmar')).toBeDefined()
    })

    it('renders default cancel label', async () => {
      const { findByText } = render(<ConfirmDialog {...defaultProps} />)
      expect(await findByText('Cancelar')).toBeDefined()
    })

    it('renders custom confirm label', async () => {
      const { findByText } = render(
        <ConfirmDialog {...defaultProps} confirmLabel="Delete" />
      )
      expect(await findByText('Delete')).toBeDefined()
    })

    it('renders custom cancel label', async () => {
      const { findByText } = render(
        <ConfirmDialog {...defaultProps} cancelLabel="Go Back" />
      )
      expect(await findByText('Go Back')).toBeDefined()
    })
  })

  describe('interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const onClose = vi.fn()
      const { findByText } = render(
        <ConfirmDialog {...defaultProps} onClose={onClose} />
      )
      
      const cancelButton = await findByText('Cancelar')
      fireEvent.click(cancelButton)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn()
      const { findByText } = render(
        <ConfirmDialog {...defaultProps} onConfirm={onConfirm} />
      )
      
      const confirmButton = await findByText('Confirmar')
      fireEvent.click(confirmButton)
      
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('loading state', () => {
    it('disables buttons when loading', async () => {
      const { findByText } = render(
        <ConfirmDialog {...defaultProps} isLoading={true} />
      )
      
      const confirmButton = await findByText('Confirmar')
      const cancelButton = await findByText('Cancelar')
      
      expect((confirmButton.closest('button') as HTMLButtonElement)?.disabled).toBe(true)
      expect((cancelButton.closest('button') as HTMLButtonElement)?.disabled).toBe(true)
    })
  })

  describe('variants', () => {
    it('renders with warning variant by default', async () => {
      const { container, findByText } = render(<ConfirmDialog {...defaultProps} />)
      await findByText('Test Dialog')
      // Warning variant uses amber colors
      expect(container.innerHTML).toContain('amber')
    })

    it('renders with danger variant', async () => {
      const { container, findByText } = render(
        <ConfirmDialog {...defaultProps} variant="danger" />
      )
      await findByText('Test Dialog')
      // Danger variant uses red colors
      expect(container.innerHTML).toContain('red')
    })

    it('renders with info variant', async () => {
      const { container, findByText } = render(
        <ConfirmDialog {...defaultProps} variant="info" />
      )
      await findByText('Test Dialog')
      // Info variant uses blue colors
      expect(container.innerHTML).toContain('blue')
    })
  })
})
