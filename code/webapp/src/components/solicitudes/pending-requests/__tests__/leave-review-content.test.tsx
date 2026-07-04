/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LeaveReviewContent } from '../leave-review-content'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleApprove = vi.fn()
const mockHandleReject = vi.fn()
const mockSetShowRejectConfirm = vi.fn()
const mockSetRejectReason = vi.fn()

const defaultHookResult = {
  showRejectConfirm: false,
  setShowRejectConfirm: mockSetShowRejectConfirm,
  rejectReason: '',
  setRejectReason: mockSetRejectReason,
  handleApprove: mockHandleApprove,
  handleReject: mockHandleReject,
  isApproving: false,
  isRejecting: false,
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-leave-review-dialog', () => ({
  useLeaveReviewDialog: () => currentHookResult,
}))

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
})
