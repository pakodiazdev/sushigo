/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/services/attendance-hooks', () => ({
  useOvertimeValuationPreview: vi.fn(() => ({ data: undefined, isFetching: false })),
}))

import { OvertimeDecisionDialog } from '../OvertimeDecisionDialog'
import * as attendanceHooks from '@/services/attendance-hooks'

afterEach(() => {
  cleanup()
  // Restore body overflow after each test
  document.body.style.overflow = 'unset'
  vi.mocked(attendanceHooks.useOvertimeValuationPreview).mockReturnValue(
    { data: undefined, isFetching: false } as unknown as ReturnType<typeof attendanceHooks.useOvertimeValuationPreview>,
  )
})

const defaultProps = {
  isOpen: true,
  attendanceId: 'att-1',
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

  it('keeps showing the last employee name and minutes while animating out after close', () => {
    const { getByText, rerender } = render(<OvertimeDecisionDialog {...defaultProps} />)
    rerender(
      <OvertimeDecisionDialog
        {...defaultProps}
        isOpen={false}
        attendanceId={null}
        employeeName=""
        overtimeMinutes={0}
      />
    )
    expect(getByText('Carlos Mendoza')).toBeDefined()
    expect(getByText(/35 min extra/)).toBeDefined()
  })
})

describe('OvertimeDecisionDialog — actions', () => {
  it('shows the valuation method step when Pagar button is clicked', () => {
    const { getByTestId, getByLabelText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(getByLabelText('Método')).toBeDefined()
  })

  it('calls onAuthorize with LFT_PROPORTIONAL by default when confirming', async () => {
    const onAuthorize = vi.fn()
    const { getByTestId } = render(
      <OvertimeDecisionDialog {...defaultProps} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.click(getByTestId('btn-confirm-valuation'))
    await waitFor(() => expect(onAuthorize).toHaveBeenCalledWith('LFT_PROPORTIONAL', undefined, undefined, false))
  })

  it('requires agreed_rate when AGREED_RATE method is selected', async () => {
    const onAuthorize = vi.fn()
    const { getByTestId, getByLabelText, findByText } = render(
      <OvertimeDecisionDialog {...defaultProps} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.change(getByLabelText('Método'), { target: { value: 'AGREED_RATE' } })
    fireEvent.click(getByTestId('btn-confirm-valuation'))
    expect(await findByText('La tarifa pactada debe ser un número mayor a 0')).toBeDefined()
    expect(onAuthorize).not.toHaveBeenCalled()
  })

  it('calls onAuthorize with AGREED_RATE and the given rate', async () => {
    const onAuthorize = vi.fn()
    const { getByTestId, getByLabelText } = render(
      <OvertimeDecisionDialog {...defaultProps} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.change(getByLabelText('Método'), { target: { value: 'AGREED_RATE' } })
    fireEvent.change(getByLabelText('Tarifa por hora'), { target: { value: '90' } })
    fireEvent.click(getByTestId('btn-confirm-valuation'))
    await waitFor(() => expect(onAuthorize).toHaveBeenCalledWith('AGREED_RATE', 90, undefined, false))
  })

  it('requires agreed_factor when SALARY_FACTOR method is selected', async () => {
    const onAuthorize = vi.fn()
    const { getByTestId, getByLabelText, findByText } = render(
      <OvertimeDecisionDialog {...defaultProps} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.change(getByLabelText('Método'), { target: { value: 'SALARY_FACTOR' } })
    fireEvent.click(getByTestId('btn-confirm-valuation'))
    expect(await findByText('El factor debe ser un número mayor a 0')).toBeDefined()
    expect(onAuthorize).not.toHaveBeenCalled()
  })

  it('calls onAuthorize with SALARY_FACTOR and the given factor', async () => {
    const onAuthorize = vi.fn()
    const { getByTestId, getByLabelText } = render(
      <OvertimeDecisionDialog {...defaultProps} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.change(getByLabelText('Método'), { target: { value: 'SALARY_FACTOR' } })
    fireEvent.change(getByLabelText(/Factor/), { target: { value: '1.5' } })
    fireEvent.click(getByTestId('btn-confirm-valuation'))
    await waitFor(() => expect(onAuthorize).toHaveBeenCalledWith('SALARY_FACTOR', undefined, 1.5, false))
  })

  it('returns to the confirm step when Regresar is clicked', () => {
    const { getByTestId, getByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.click(getByText('Regresar'))
    expect(getByTestId('btn-authorize-overtime')).toBeDefined()
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

describe('OvertimeDecisionDialog — cost preview', () => {
  it('shows a placeholder message when no preview is available yet', () => {
    const { getByTestId, getByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(getByText('Completa los datos para ver el monto estimado.')).toBeDefined()
  })

  it('shows a loading indicator while the preview is fetching', () => {
    vi.mocked(attendanceHooks.useOvertimeValuationPreview).mockReturnValue({
      data: undefined,
      isFetching: true,
    } as unknown as ReturnType<typeof attendanceHooks.useOvertimeValuationPreview>)

    const { getByTestId, getByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(getByText('Calculando...')).toBeDefined()
  })

  it('shows the estimated amount once the preview resolves', () => {
    vi.mocked(attendanceHooks.useOvertimeValuationPreview).mockReturnValue({
      data: { valuation_method: 'AGREED_RATE', rate_applied: 90, amount: 45, accumulated_hours: null },
      isFetching: false,
    } as unknown as ReturnType<typeof attendanceHooks.useOvertimeValuationPreview>)

    const { getByTestId } = render(<OvertimeDecisionDialog {...defaultProps} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(getByTestId('overtime-preview').textContent).toContain('45')
  })

  it('shows the real error message when the preview fails (e.g. no LFT tiers configured)', () => {
    vi.mocked(attendanceHooks.useOvertimeValuationPreview).mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      error: new Error('No hay un tramo LFT configurado para las horas acumuladas de este empleado.'),
    } as unknown as ReturnType<typeof attendanceHooks.useOvertimeValuationPreview>)

    const { getByTestId, getByText, queryByText } = render(<OvertimeDecisionDialog {...defaultProps} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(getByText('No hay un tramo LFT configurado para las horas acumuladas de este empleado.')).toBeDefined()
    expect(queryByText(/Completa los datos/)).toBeNull()
  })
})

describe('OvertimeDecisionDialog — apply to rest (bulk flow)', () => {
  it('does not render the checkbox when remainingCount is not provided', () => {
    const { queryByTestId } = render(<OvertimeDecisionDialog {...defaultProps} />)
    expect(queryByTestId('checkbox-apply-to-rest')).toBeNull()
  })

  it('does not render the checkbox when remainingCount is 1 (individual flow)', () => {
    const { queryByTestId } = render(<OvertimeDecisionDialog {...defaultProps} remainingCount={1} />)
    expect(queryByTestId('checkbox-apply-to-rest')).toBeNull()
  })

  it('renders the checkbox on the confirm step when remainingCount is greater than 1', () => {
    const { getByTestId, getByText } = render(<OvertimeDecisionDialog {...defaultProps} remainingCount={4} />)
    expect(getByTestId('checkbox-apply-to-rest')).toBeDefined()
    expect(getByText(/Aplicar para el resto/)).toBeDefined()
    expect(getByText(/3 empleados/)).toBeDefined()
  })

  it('uses singular "empleado" when only one other entry remains in the queue', () => {
    const { getByText } = render(<OvertimeDecisionDialog {...defaultProps} remainingCount={2} />)
    expect(getByText('Aplicar para el resto (1 empleado)')).toBeDefined()
  })

  it('renders the checkbox on the method step when remainingCount is greater than 1', () => {
    const { getByTestId } = render(<OvertimeDecisionDialog {...defaultProps} remainingCount={3} />)
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    expect(getByTestId('checkbox-apply-to-rest')).toBeDefined()
  })

  it('calls onReject with applyToRest=true when the checkbox is checked', () => {
    const onReject = vi.fn()
    const { getByTestId } = render(
      <OvertimeDecisionDialog {...defaultProps} remainingCount={3} onReject={onReject} />
    )
    fireEvent.click(getByTestId('checkbox-apply-to-rest'))
    fireEvent.click(getByTestId('btn-reject-overtime'))
    expect(onReject).toHaveBeenCalledWith(true)
  })

  it('calls onReject with applyToRest=false when the checkbox is left unchecked', () => {
    const onReject = vi.fn()
    const { getByTestId } = render(
      <OvertimeDecisionDialog {...defaultProps} remainingCount={3} onReject={onReject} />
    )
    fireEvent.click(getByTestId('btn-reject-overtime'))
    expect(onReject).toHaveBeenCalledWith(false)
  })

  it('calls onAuthorize with applyToRest=true when the checkbox is checked on the method step', async () => {
    const onAuthorize = vi.fn()
    const { getByTestId } = render(
      <OvertimeDecisionDialog {...defaultProps} remainingCount={3} onAuthorize={onAuthorize} />
    )
    fireEvent.click(getByTestId('btn-authorize-overtime'))
    fireEvent.click(getByTestId('checkbox-apply-to-rest'))
    fireEvent.click(getByTestId('btn-confirm-valuation'))
    await waitFor(() => expect(onAuthorize).toHaveBeenCalledWith('LFT_PROPORTIONAL', undefined, undefined, true))
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
