// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { RequestStatusCard } from '../request-status-card'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { onClick, disabled, ...props }, children),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'loader' }),
  AlertTriangle: () => React.createElement('span', { 'data-testid': 'alert-triangle' }),
}))

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    isOpen,
    onConfirm,
    onClose,
    title,
    description,
    confirmLabel,
    isLoading,
  }: {
    isOpen: boolean
    onConfirm: () => void
    onClose: () => void
    title: string
    description: string
    confirmLabel: string
    isLoading?: boolean
  }) =>
    isOpen
      ? React.createElement(
          'div',
          { 'data-testid': 'confirm-dialog' },
          React.createElement('p', null, title),
          React.createElement('p', null, description),
          React.createElement('button', { 'data-testid': 'confirm-btn', onClick: onConfirm, disabled: isLoading }, confirmLabel),
          React.createElement('button', { 'data-testid': 'cancel-confirm-btn', onClick: onClose }, 'No'),
        )
      : null,
}))

vi.mock('@/services/leave-hooks', () => ({
  useLeaveTypes: () => ({
    data: [{ id: 1, code: 'MEDICAL', name: 'Incapacidad médica', calculation_mode: 'FIXED_PERCENTAGE', default_pay_percentage: 0, default_rest_day_factor: 'NONE', counts_for_bonus: false }],
  }),
}))

afterEach(cleanup)

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: '01HZTEST00000001',
    employee_id: '01HZTEST00000002',
    employee_name: 'Test Employee',
    type: 'EXTRA_DAY',
    status: 'PENDING',
    payload: { date: '2026-06-15', salary_pct: 100, prima_pct: 100, salary_day: 200, prima: 200, seventh_day: 200, total: 600 },
    requestable: null,
    requested_by: '01HZTEST00000003',
    approved_by: null,
    approved_at: null,
    notes: null,
    rejection_reason: null,
    created_at: '2026-04-24T10:00:00+00:00',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RequestStatusCard — PENDING', () => {
  it('renders the "Día extra solicitado" heading', () => {
    render(<RequestStatusCard request={makeRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Día extra solicitado/)).toBeDefined()
  })

  it('shows the PENDING label', () => {
    render(<RequestStatusCard request={makeRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Pendiente de aprobación')).toBeDefined()
  })

  it('shows the formatted date', () => {
    render(<RequestStatusCard request={makeRequest()} onCancel={vi.fn()} isCancelling={false} />)
    // formatDate('2026-06-15') → some weekday+date string — just verify it's present
    expect(screen.getByText(/2026/)).toBeDefined()
  })

  it('shows a Cancelar button when PENDING', () => {
    render(<RequestStatusCard request={makeRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Cancelar')).toBeDefined()
  })

  it('calls onCancel with the request id after confirming in dialog', () => {
    const onCancel = vi.fn()
    render(<RequestStatusCard request={makeRequest()} onCancel={onCancel} isCancelling={false} />)
    fireEvent.click(screen.getByText('Cancelar'))
    // Confirm dialog should now be open — click the confirm button
    fireEvent.click(screen.getByTestId('confirm-btn'))
    expect(onCancel).toHaveBeenCalledWith('01HZTEST00000001')
  })

  it('shows the loader and disables the button while cancelling', () => {
    render(<RequestStatusCard request={makeRequest()} onCancel={vi.fn()} isCancelling={true} />)
    expect(screen.getByTestId('loader')).toBeDefined()
    const btn = screen.getByRole('button')
    expect(btn).toHaveProperty('disabled', true)
  })
})

describe('RequestStatusCard — APPROVED', () => {
  it('shows the Aprobado label', () => {
    render(<RequestStatusCard request={makeRequest({ status: 'APPROVED' })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Aprobado')).toBeDefined()
  })

  it('does NOT show a Cancelar button for a past approved date', () => {
    const payload = { date: '2026-01-15', salary_pct: 100, prima_pct: 100, salary_day: 200, prima: 200, seventh_day: 200, total: 600 }
    render(<RequestStatusCard request={makeRequest({ status: 'APPROVED', payload })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.queryByText('Cancelar')).toBeNull()
  })

  it('shows a Cancelar button for a future approved date', () => {
    const payload = { date: '2099-12-31', salary_pct: 100, prima_pct: 100, salary_day: 200, prima: 200, seventh_day: 200, total: 600 }
    render(<RequestStatusCard request={makeRequest({ status: 'APPROVED', payload })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Cancelar')).toBeDefined()
  })

  it('does NOT show notes on APPROVED (no manager note in MVP)', () => {
    render(
      <RequestStatusCard
        request={makeRequest({ status: 'APPROVED', notes: 'Buen trabajo' })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    expect(screen.queryByText(/"Buen trabajo"/)).toBeNull()
  })
})

describe('RequestStatusCard — REJECTED', () => {
  it('shows the Rechazado label', () => {
    render(<RequestStatusCard request={makeRequest({ status: 'REJECTED' })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Rechazado')).toBeDefined()
  })

  it('shows the rejection reason when present', () => {
    render(
      <RequestStatusCard
        request={makeRequest({ status: 'REJECTED', rejection_reason: 'No aplica' })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    expect(screen.getByText('"No aplica"')).toBeDefined()
  })

  it('does NOT show a Cancelar button', () => {
    render(<RequestStatusCard request={makeRequest({ status: 'REJECTED' })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.queryByText('Cancelar')).toBeNull()
  })
})

describe('RequestStatusCard — prima display', () => {
  it('shows prima_pct from payload', () => {
    render(<RequestStatusCard request={makeRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Prima propuesta: 100%/)).toBeDefined()
  })
})

describe('RequestStatusCard — employee notes', () => {
  it('shows employee note in PENDING status', () => {
    render(
      <RequestStatusCard
        request={makeRequest({ status: 'PENDING', notes: 'Quiero apoyar ese día' })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    expect(screen.getByText(/Quiero apoyar ese día/)).toBeDefined()
  })

  it('does not show employee note when status is not PENDING', () => {
    render(
      <RequestStatusCard
        request={makeRequest({ status: 'APPROVED', notes: 'Quiero apoyar ese día' })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    expect(screen.queryByText(/Quiero apoyar ese día/)).toBeNull()
  })
})

describe('RequestStatusCard — null / missing payload', () => {
  it('renders without crashing when payload is null', () => {
    render(<RequestStatusCard request={makeRequest({ payload: null })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Día extra solicitado/)).toBeDefined()
  })

  it('shows 0% prima when payload is null', () => {
    render(<RequestStatusCard request={makeRequest({ payload: null })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Prima propuesta: 0%/)).toBeDefined()
  })

  it('does NOT show currency amount when primaAmount is 0', () => {
    const payload = { date: '2026-06-15', salary_pct: 100, prima_pct: 50, salary_day: 200, prima: 0, seventh_day: 200, total: 400 }
    render(<RequestStatusCard request={makeRequest({ payload })} onCancel={vi.fn()} isCancelling={false} />)
    // primaAmount === 0 → the "· $..." part should not appear
    expect(screen.queryByText(/·/)).toBeNull()
  })
})

describe('RequestStatusCard — CANCELLED', () => {
  it('shows the Cancelado label', () => {
    render(<RequestStatusCard request={makeRequest({ status: 'CANCELLED' })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Cancelado')).toBeDefined()
  })

  it('does NOT show a Cancelar button', () => {
    render(<RequestStatusCard request={makeRequest({ status: 'CANCELLED' })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.queryByText('Cancelar')).toBeNull()
  })
})

describe('RequestStatusCard — REJECTED without rejection_reason', () => {
  it('does NOT show a rejection reason line when rejection_reason is null', () => {
    render(
      <RequestStatusCard
        request={makeRequest({ status: 'REJECTED', rejection_reason: null })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    // No italic quoted reason should appear
    expect(screen.queryByText(/"/)).toBeNull()
  })
})

describe('RequestStatusCard — LEAVE type', () => {
  function makeLeaveRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
    return makeRequest({
      type: 'LEAVE',
      payload: { leave_type_id: 1, dates: ['2026-06-15'] },
      ...overrides,
    })
  }

  it('renders the leave type name instead of "Día extra solicitado"', () => {
    render(<RequestStatusCard request={makeLeaveRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Incapacidad médica solicitado/)).toBeDefined()
    expect(screen.queryByText(/Día extra solicitado/)).toBeNull()
  })

  it('shows the PENDING label', () => {
    render(<RequestStatusCard request={makeLeaveRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText('Pendiente de aprobación')).toBeDefined()
  })

  it('is cancellable when APPROVED and end_date is in the future', () => {
    const future = '2099-01-01'
    render(
      <RequestStatusCard
        request={makeLeaveRequest({ status: 'APPROVED', payload: { leave_type_id: 1, dates: [future] } })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    expect(screen.getByText('Cancelar')).toBeDefined()
  })

  it('cancel confirmation mentions "permiso" instead of "día extra"', () => {
    render(<RequestStatusCard request={makeLeaveRequest()} onCancel={vi.fn()} isCancelling={false} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.getByText(/Tu solicitud de permiso será cancelada/)).toBeDefined()
  })
})

describe('RequestStatusCard — VACATION type', () => {
  function makeVacationRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
    return makeRequest({
      type: 'VACATION',
      payload: { dates: ['2026-08-10', '2026-08-12'] },
      ...overrides,
    })
  }

  it('renders "Vacaciones solicitadas" instead of "Día extra solicitado"', () => {
    render(<RequestStatusCard request={makeVacationRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/Vacaciones solicitadas/)).toBeDefined()
    expect(screen.queryByText(/Día extra solicitado/)).toBeNull()
  })

  it('renders the requested dates', () => {
    render(<RequestStatusCard request={makeVacationRequest()} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.getByText(/10 de agosto.*12 de agosto/)).toBeDefined()
  })

  it('is cancellable when APPROVED and the last date is in the future', () => {
    const future = '2099-01-01'
    render(
      <RequestStatusCard
        request={makeVacationRequest({ status: 'APPROVED', payload: { dates: [future] } })}
        onCancel={vi.fn()}
        isCancelling={false}
      />
    )
    expect(screen.getByText('Cancelar')).toBeDefined()
  })

  it('cancel confirmation mentions "vacaciones" and the balance restitution', () => {
    render(<RequestStatusCard request={makeVacationRequest()} onCancel={vi.fn()} isCancelling={false} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.getByText(/Tu solicitud de vacaciones será cancelada/)).toBeDefined()
  })

  it('approved cancel confirmation mentions balance restitution', () => {
    render(<RequestStatusCard request={makeVacationRequest({ status: 'APPROVED', payload: { dates: ['2099-01-01'] } })} onCancel={vi.fn()} isCancelling={false} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.getByText(/el saldo se restituirá/)).toBeDefined()
  })
})
