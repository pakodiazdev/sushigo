// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/lib/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/format')>()
  return {
    ...actual,
    formatCurrency: (v: number) => `$${v.toFixed(2)}`,
  }
})

vi.mock('@/services/leave-hooks', () => ({
  useLeaveTypes: () => ({
    data: [{ id: 1, code: 'MEDICAL', name: 'Incapacidad médica', calculation_mode: 'FIXED_PERCENTAGE', default_pay_percentage: 0, default_rest_day_factor: 'NONE', counts_for_bonus: false }],
  }),
}))

import { PendingRequestCard } from '../pending-request-card'

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: 'req-1',
    employee_id: 'emp-1',
    employee_name: 'Ana García',
    avatar_url: null,
    type: 'EXTRA_DAY',
    status: 'PENDING',
    payload: { date: '2026-06-15', salary_pct: 100, salary_day: 200, prima_pct: 100, prima: 200, seventh_day: 200, total: 600 },
    requestable: null,
    requested_by: 'emp-1',
    approved_by: null,
    approved_at: null,
    notes: null,
    rejection_reason: null,
    created_at: '2026-04-24T10:00:00+00:00',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

afterEach(cleanup)

describe('PendingRequestCard — basic render', () => {
  it('renders employee name', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Ana García')).toBeDefined()
  })

  it('renders an Avatar next to the employee name', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByRole('img', { name: 'Ana García' })).toBeDefined()
  })

  it('renders the request type label', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('➕ Día extra')).toBeDefined()
  })

  it('renders formatted date from payload', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/2026/)).toBeDefined()
  })

  it('renders prima percentage', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/100%/)).toBeDefined()
  })

  it('renders formatted prima amount when primaAmount > 0', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/\$200\.00/)).toBeDefined()
  })

  it('renders review button', () => {
    render(<PendingRequestCard request={makeRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Revisar →')).toBeDefined()
  })
})

describe('PendingRequestCard — notes', () => {
  it('renders notes when present', () => {
    const request = makeRequest({ notes: 'Necesito el dinero urgente' })
    render(<PendingRequestCard request={request} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/"Necesito el dinero urgente"/)).toBeDefined()
  })

  it('does not render notes element when notes is null', () => {
    render(<PendingRequestCard request={makeRequest({ notes: null })} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.queryByText(/"/)).toBeNull()
  })
})

describe('PendingRequestCard — no date', () => {
  it('does not crash when payload has no date', () => {
    const request = makeRequest({ payload: { date: '', salary_pct: 100, salary_day: 200, prima_pct: 50, prima: 100, seventh_day: 200, total: 500 } })
    render(<PendingRequestCard request={request} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Ana García')).toBeDefined()
  })
})

describe('PendingRequestCard — no prima amount', () => {
  it('does not show amount when primaAmount is 0', () => {
    const request = makeRequest({ payload: { date: '2026-06-15', salary_pct: 100, salary_day: 200, prima_pct: 0, prima: 0, seventh_day: 200, total: 400 } })
    render(<PendingRequestCard request={request} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.queryByText(/\$0\.00/)).toBeNull()
  })
})

describe('PendingRequestCard — interaction', () => {
  it('calls onReview with the request when button is clicked', () => {
    const onReview = vi.fn()
    const request = makeRequest()
    render(<PendingRequestCard request={request} onReview={onReview} onCancel={vi.fn()} isCancelling={false} />)
    fireEvent.click(screen.getByText('Revisar →'))
    expect(onReview).toHaveBeenCalledWith(request)
  })
})

describe('PendingRequestCard — LEAVE type', () => {
  function makeLeaveRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
    return makeRequest({
      type: 'LEAVE',
      payload: { leave_type_id: 1, dates: ['2026-06-15'] },
      ...overrides,
    })
  }

  it('renders the leave type name instead of "Día extra"', () => {
    render(<PendingRequestCard request={makeLeaveRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Incapacidad médica/)).toBeDefined()
    expect(screen.queryByText(/Día extra/)).toBeNull()
  })

  it('renders a single date for same-day leave', () => {
    render(<PendingRequestCard request={makeLeaveRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/15 de jun/)).toBeDefined()
  })

  it('renders a date range for multi-day leave', () => {
    const request = makeLeaveRequest({ payload: { leave_type_id: 1, dates: ['2026-06-15', '2026-06-16', '2026-06-17'] } })
    render(<PendingRequestCard request={request} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/15 de jun.*—.*17 de jun/)).toBeDefined()
  })

  it('cancel confirmation mentions "permiso" instead of "día extra"', () => {
    render(<PendingRequestCard request={makeLeaveRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    fireEvent.click(screen.getByLabelText('Cancelar solicitud'))
    expect(screen.getByText(/Se cancelará la solicitud de permiso/)).toBeDefined()
  })
})

describe('PendingRequestCard — VACATION type', () => {
  function makeVacationRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
    return makeRequest({
      type: 'VACATION',
      payload: { dates: ['2026-08-10', '2026-08-12'] },
      ...overrides,
    })
  }

  it('renders the "Vacaciones" label', () => {
    render(<PendingRequestCard request={makeVacationRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/🌴 Vacaciones/)).toBeDefined()
  })

  it('renders the requested dates', () => {
    render(<PendingRequestCard request={makeVacationRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/10 de ago.*12 de ago/)).toBeDefined()
  })

  it('cancel confirmation mentions "vacaciones"', () => {
    render(<PendingRequestCard request={makeVacationRequest()} onReview={vi.fn()} onCancel={vi.fn()} isCancelling={false} />)
    fireEvent.click(screen.getByLabelText('Cancelar solicitud'))
    expect(screen.getByText(/Se cancelará la solicitud de vacaciones/)).toBeDefined()
  })
})
