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

  it('calls onCancel with the request id when Cancelar is clicked', () => {
    const onCancel = vi.fn()
    render(<RequestStatusCard request={makeRequest()} onCancel={onCancel} isCancelling={false} />)
    fireEvent.click(screen.getByText('Cancelar'))
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

  it('does NOT show a Cancelar button', () => {
    render(<RequestStatusCard request={makeRequest({ status: 'APPROVED' })} onCancel={vi.fn()} isCancelling={false} />)
    expect(screen.queryByText('Cancelar')).toBeNull()
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
