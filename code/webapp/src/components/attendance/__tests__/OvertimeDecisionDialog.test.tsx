/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { OvertimeDecisionDialog } from '../OvertimeDecisionDialog'

afterEach(() => {
  cleanup()
  // Restore body overflow after each test
  document.body.style.overflow = 'unset'
})

const defaultProps = {
  isOpen: true,
  employeeName: 'Carlos Mendoza',
  overtimeMinutes: 35,
  isLoading: false,
  onAuthorize: vi.fn(),
  onReject: vi.fn(),
  onClose: vi.fn(),
}

describe('OvertimeDecisionDialog — rendering', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <OvertimeDecisionDialog {...defaultProps} isOpen={false} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when isOpen is true', () => {
    const { getByRole } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(getByRole('dialog')).toBeDefined()
  })

  it('shows employee name and overtime minutes', () => {
    const { getByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(getByText('Carlos Mendoza')).toBeDefined()
    expect(getByText(/35 min extra/)).toBeDefined()
  })

  it('renders Pagar and No pagar buttons', () => {
    const { getByTestId } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(getByTestId('btn-authorize-overtime')).toBeDefined()
    expect(getByTestId('btn-reject-overtime')).toBeDefined()
  })

  it('renders Cancelar button', () => {
    const { getByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(getByText('Cancelar')).toBeDefined()
  })
})

describe('OvertimeDecisionDialog — actions', () => {
  it('calls onAuthorize when Pagar button is clicked', () => {
    const onAuthorize = vi.fn()
    const { getByTestId } = render(
      <OvertimeDecisionDialog {...defaultProps} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(onAuthorize).toHaveBeenCalledOnce()
  })

  it('calls onReject when No pagar button is clicked', () => {
    const onReject = vi.fn()
    const { getByTestId } = render(
      <OvertimeDecisionDialog {...defaultProps} onReject={onReject} />
    )
    fireEvent.click(getByTestId('btn-reject-overtime'))
    expect(onReject).toHaveBeenCalledOnce()
  })

  it('calls onClose when Cancelar button is clicked', () => {
    const onClose = vi.fn()
    const { getByText } = render(
      <OvertimeDecisionDialog {...defaultProps} onClose={onClose} />
    )
    fireEvent.click(getByText('Cancelar'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { getByLabelText } = render(
      <OvertimeDecisionDialog {...defaultProps} onClose={onClose} />
    )
    fireEvent.click(getByLabelText('Cerrar diálogo'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<OvertimeDecisionDialog {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose on Escape when isLoading is true', () => {
    const onClose = vi.fn()
    render(
      <OvertimeDecisionDialog {...defaultProps} isLoading={true} onClose={onClose} />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not call onClose when backdrop clicked while loading', () => {
    const onClose = vi.fn()
    const { getByLabelText } = render(
      <OvertimeDecisionDialog {...defaultProps} isLoading={true} onClose={onClose} />
    )
    fireEvent.click(getByLabelText('Cerrar diálogo'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('OvertimeDecisionDialog — disabled state', () => {
  it('disables all action buttons when isLoading is true', () => {
    const { getByTestId, getByText } = render(
      <OvertimeDecisionDialog {...defaultProps} isLoading={true} />
    )
    expect((getByTestId('btn-authorize-overtime') as HTMLButtonElement).disabled).toBe(true)
    expect((getByTestId('btn-reject-overtime') as HTMLButtonElement).disabled).toBe(true)
    expect((getByText('Cancelar') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('OvertimeDecisionDialog — scroll lock', () => {
  it('sets body overflow to hidden when open', () => {
    render(<OvertimeDecisionDialog {...defaultProps} isOpen={true} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body overflow when closed', () => {
    const { rerender } = render(
      <OvertimeDecisionDialog {...defaultProps} isOpen={true} />
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<OvertimeDecisionDialog {...defaultProps} isOpen={false} />)
    expect(document.body.style.overflow).toBe('unset')
  })
})

describe('OvertimeDecisionDialog — dialog title', () => {
  it('renders the dialog title', () => {
    const { getByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(getByText('Decisión de horas extra')).toBeDefined()
  })

  it('uses aria-labelledby pointing to title', () => {
    const { getByRole } = render(<OvertimeDecisionDialog {...defaultProps} />)
    const dialog = getByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBe('overtime-dialog-title')
  })
})

describe('OvertimeDecisionDialog — OvertimeDecisionBadge (via EmployeeAttendanceCard tests)', () => {
  it('renders without crashing', () => {
    const { container } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(container).toBeDefined()
  })
})

// Edge case: Escape key listener removed on unmount
describe('OvertimeDecisionDialog — cleanup', () => {
  it('removes keydown listener on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <OvertimeDecisionDialog {...defaultProps} onClose={onClose} />
    )
    unmount()
    // Firing Escape after unmount should not call onClose
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
