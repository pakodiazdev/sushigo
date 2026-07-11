/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { VacationReviewContent } from '../vacation-review-content'
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

vi.mock('../use-vacation-review-dialog', () => ({
  useVacationReviewDialog: () => currentHookResult,
}))

// ── Fixture ────────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: 'req-1',
    employee_id: 'emp-1',
    employee_name: 'Ana García',
    type: 'VACATION',
    status: 'PENDING',
    payload: { dates: ['2026-08-10', '2026-08-12'] },
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

describe('VacationReviewContent', () => {
  beforeEach(() => {
    currentHookResult = { ...defaultHookResult }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the "Vacaciones" title and the requested dates', () => {
    render(<VacationReviewContent request={makeRequest()} onClose={vi.fn()} />)

    expect(screen.getByText('🌴 Vacaciones')).toBeDefined()
    expect(screen.getByText(/10 de agosto.*12 de agosto/)).toBeDefined()
  })

  it('renders notes when present', () => {
    render(<VacationReviewContent request={makeRequest({ notes: 'Viaje familiar' })} onClose={vi.fn()} />)
    expect(screen.getByText('"Viaje familiar"')).toBeDefined()
  })

  it('calls handleApprove when "Aprobar vacaciones" is clicked', () => {
    render(<VacationReviewContent request={makeRequest()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Aprobar vacaciones'))

    expect(mockHandleApprove).toHaveBeenCalledOnce()
  })

  it('opens the reject confirmation when "Rechazar" is clicked', () => {
    render(<VacationReviewContent request={makeRequest()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Rechazar'))

    expect(mockSetShowRejectConfirm).toHaveBeenCalledWith(true)
  })

  it('disables both actions while approving', () => {
    currentHookResult = { ...defaultHookResult, isApproving: true }
    render(<VacationReviewContent request={makeRequest()} onClose={vi.fn()} />)

    expect(screen.getByText('Aprobar vacaciones').closest('button')?.disabled).toBe(true)
    expect(screen.getByText('Rechazar').closest('button')?.disabled).toBe(true)
  })
})
