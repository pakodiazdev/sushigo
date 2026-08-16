/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LeaveReviewContent } from '../leave-review-content'
import type { LeavePayOption } from '../use-leave-review-dialog'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleApprove = vi.fn()
const mockHandleReject = vi.fn()
const mockSetShowRejectConfirm = vi.fn()
const mockSetRejectReason = vi.fn()
const mockSelectQuickOption = vi.fn()
const mockSelectCustomOption = vi.fn()
const mockSetCustomPercentage = vi.fn()
const mockSetCustomAmount = vi.fn()

const defaultHookResult = {
  showRejectConfirm: false,
  setShowRejectConfirm: mockSetShowRejectConfirm,
  rejectReason: '',
  setRejectReason: mockSetRejectReason,
  requestedPayPercentage: null as number | null,
  payOption: 0 as LeavePayOption,
  payPercentage: 0,
  payAmount: 0,
  dailyWage: 0,
  totalDays: 1,
  amountForPercentage: (pct: number) => pct,
  selectQuickOption: mockSelectQuickOption,
  selectCustomOption: mockSelectCustomOption,
  setCustomPercentage: mockSetCustomPercentage,
  setCustomAmount: mockSetCustomAmount,
  handleApprove: mockHandleApprove,
  handleReject: mockHandleReject,
  isApproving: false,
  isRejecting: false,
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-leave-review-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../use-leave-review-dialog')>()
  return {
    ...actual,
    useLeaveReviewDialog: () => currentHookResult,
  }
})

vi.mock('@/services/leave-hooks', () => ({
  useLeaveTypes: () => ({
    data: [{ id: 1, code: 'MEDICAL', name: 'Incapacidad médica', calculation_mode: 'FIXED_PERCENTAGE', default_pay_percentage: 0, default_rest_day_factor: 'NONE', counts_for_bonus: false }],
  }),
}))

// ── Fixture ────────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: 'req-1',
    employee_id: 'emp-1',
    employee_name: 'Ana García',
    avatar_url: null,
    type: 'LEAVE',
    status: 'PENDING',
    payload: { leave_type_id: 1, dates: ['2026-06-15'] },
    requestable: null,
    requested_by: 'emp-1',
    approved_by: null,
    approved_at: null,
    notes: null,
    rejection_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LeaveReviewContent', () => {
  beforeEach(() => {
    currentHookResult = { ...defaultHookResult }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the leave type name', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Incapacidad médica')).toBeDefined()
  })

  it('falls back to "Permiso" when leave type is not found', () => {
    render(<LeaveReviewContent request={makeRequest({ payload: { leave_type_id: 999, dates: ['2026-06-15'] } })} onClose={vi.fn()} />)
    expect(screen.getByText('Permiso')).toBeDefined()
  })

  it('renders a single date for same-day leave', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText(/15 de jun/)).toBeDefined()
  })

  it('renders SCHEDULED time info', () => {
    const request = makeRequest({
      payload: { leave_type_id: 1, dates: ['2026-06-15'], time_mode: 'SCHEDULED', scheduled_start_time: '14:00', scheduled_end_time: '16:00' },
    })
    render(<LeaveReviewContent request={request} onClose={vi.fn()} />)
    expect(screen.getByText(/14:00.*16:00/)).toBeDefined()
  })

  it('renders OPEN_ENDED time info', () => {
    const request = makeRequest({
      payload: { leave_type_id: 1, dates: ['2026-06-15'], time_mode: 'OPEN_ENDED', scheduled_start_time: '15:00' },
    })
    render(<LeaveReviewContent request={request} onClose={vi.fn()} />)
    expect(screen.getByText(/Sale a las 15:00/)).toBeDefined()
  })

  it('renders the requester note', () => {
    render(<LeaveReviewContent request={makeRequest({ notes: 'Cita médica' })} onClose={vi.fn()} />)
    expect(screen.getByText('"Cita médica"')).toBeDefined()
  })

  it('calls handleApprove when "Aprobar permiso" is clicked', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Aprobar permiso'))
    expect(mockHandleApprove).toHaveBeenCalledOnce()
  })

  it('opens the reject confirm dialog when "Rechazar" is clicked', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Rechazar'))
    expect(mockSetShowRejectConfirm).toHaveBeenCalledWith(true)
  })

  it('renders the reject confirm dialog with a note textarea when open', () => {
    currentHookResult = { ...defaultHookResult, showRejectConfirm: true }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Rechazar solicitud')).toBeDefined()
    expect(screen.getByPlaceholderText('Ej: No hay cobertura suficiente ese día')).toBeDefined()
  })

  it('disables the approve/reject buttons while approving', () => {
    currentHookResult = { ...defaultHookResult, isApproving: true }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Aprobar permiso').closest('button')?.disabled).toBe(true)
    expect(screen.getByText('Rechazar').closest('button')?.disabled).toBe(true)
  })

  it('renders the quick pay options with the default selection marked', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Sin goce de sueldo')).toBeDefined()
    expect(screen.getByText('Con goce de sueldo')).toBeDefined()
    expect(screen.getByText('25%')).toBeDefined()
    expect(screen.getByText('50%')).toBeDefined()
    expect(screen.getByText('75%')).toBeDefined()
    const unpaidRadio = screen.getByText('Sin goce de sueldo').closest('label')?.querySelector('input')
    expect(unpaidRadio?.checked).toBe(true)
  })

  it('calls selectQuickOption(100) when "Con goce de sueldo" is clicked', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    const paidRadio = screen.getByText('Con goce de sueldo').closest('label')?.querySelector('input')
    fireEvent.click(paidRadio!)
    expect(mockSelectQuickOption).toHaveBeenCalledWith(100)
  })

  it('calls selectQuickOption(25) when the "25%" option is clicked', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    const radio25 = screen.getByText('25%').closest('label')?.querySelector('input')
    fireEvent.click(radio25!)
    expect(mockSelectQuickOption).toHaveBeenCalledWith(25)
  })

  it('shows the $ amount for each quick option when the daily wage is known', () => {
    currentHookResult = {
      ...defaultHookResult,
      dailyWage: 800,
      amountForPercentage: (pct: number) => (pct / 100) * 800,
    }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('$0.00')).toBeDefined()
    expect(screen.getByText('$800.00')).toBeDefined()
    expect(screen.getByText('$200.00')).toBeDefined()
    expect(screen.getByText('$400.00')).toBeDefined()
    expect(screen.getByText('$600.00')).toBeDefined()
  })

  it('does not show $ amounts when the daily wage is unknown', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.queryByText('$0.00')).toBeNull()
  })

  it('shows the custom percentage and $ inputs only when payOption is custom', () => {
    currentHookResult = { ...defaultHookResult, payOption: 'custom', payPercentage: 35, payAmount: 280, dailyWage: 800 }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('35')).toBeDefined()
    expect(screen.getByDisplayValue('280')).toBeDefined()
  })

  it('calls setCustomPercentage when the custom percentage input changes', () => {
    currentHookResult = { ...defaultHookResult, payOption: 'custom', payPercentage: 35, payAmount: 280, dailyWage: 800 }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByDisplayValue('35'), { target: { value: '60' } })
    expect(mockSetCustomPercentage).toHaveBeenCalledWith(60)
  })

  it('calls setCustomAmount when the custom $ input changes', () => {
    currentHookResult = { ...defaultHookResult, payOption: 'custom', payPercentage: 35, payAmount: 280, dailyWage: 800 }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByDisplayValue('280'), { target: { value: '400' } })
    expect(mockSetCustomAmount).toHaveBeenCalledWith(400)
  })

  it('does not render the custom $ input when the daily wage is unknown', () => {
    currentHookResult = { ...defaultHookResult, payOption: 'custom', payPercentage: 35, payAmount: 0, dailyWage: 0 }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('35')).toBeDefined()
    expect(screen.queryByDisplayValue('0')).toBeNull()
  })

  it('shows what the employee requested when the payload carries pay_percentage', () => {
    currentHookResult = { ...defaultHookResult, requestedPayPercentage: 100 }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText(/El empleado solicitó: con goce de sueldo/)).toBeDefined()
  })

  it('shows "sin goce de sueldo" when the employee requested pay_percentage 0', () => {
    currentHookResult = { ...defaultHookResult, requestedPayPercentage: 0 }
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText(/El empleado solicitó: sin goce de sueldo/)).toBeDefined()
  })

  it('does not show the requested-pay line when the payload has no pay_percentage', () => {
    render(<LeaveReviewContent request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.queryByText(/El empleado solicitó/)).toBeNull()
  })
})
