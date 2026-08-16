// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleApprove = vi.fn()
const mockHandleReject = vi.fn()
const mockSetShowRejectConfirm = vi.fn()
const mockRegister = vi.fn(() => ({}))
const mockWatch = vi.fn()
const mockSetValue = vi.fn()
const mockHandleSubmit = vi.fn((fn) => (e?: Event) => { e?.preventDefault?.(); fn({}) })

const defaultHookReturn = {
  form: {
    register: mockRegister,
    watch: mockWatch,
    setValue: mockSetValue,
    formState: { errors: {} },
    handleSubmit: mockHandleSubmit,
  },
  salaryDay: 200,
  prima: 200,
  seventhDay: 200,
  total: 600,
  effectivePrimaPct: 100,
  proposedSalaryDay: 200,
  proposedPrimaPct: 100,
  showRejectConfirm: false,
  setShowRejectConfirm: mockSetShowRejectConfirm,
  handleApprove: mockHandleApprove,
  handleReject: mockHandleReject,
  isApproving: false,
  isRejecting: false,
}

const mockUseReviewRequestDialog = vi.fn(() => defaultHookReturn)

vi.mock('../use-review-request-dialog', () => ({
  useReviewRequestDialog: () => mockUseReviewRequestDialog(),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'slide-panel' },
          React.createElement('span', { 'data-testid': 'panel-title' }, title),
          children)
      : null,
}))

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
  }: {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: React.ReactNode
  }) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'confirm-dialog' },
          React.createElement('span', null, title),
          typeof description === 'string'
            ? React.createElement('span', null, description)
            : description,
          React.createElement('button', { onClick: onConfirm, 'data-testid': 'confirm-btn' }, 'Confirmar'),
          React.createElement('button', { onClick: onClose, 'data-testid': 'close-confirm-btn' }, 'Cancelar'))
      : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
  }: {
    children: React.ReactNode
    onClick?: () => void
    type?: string
    disabled?: boolean
  }) =>
    React.createElement('button', { onClick, type: type ?? 'button', disabled: disabled ?? false }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', { ...props, 'data-testid': 'number-input' }),
}))

vi.mock('@/components/ui/form-fields', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
    React.createElement('textarea', { ...props }),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'spinner' }),
}))

vi.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `$${v.toFixed(2)}`,
}))

vi.mock('../leave-review-content', () => ({
  LeaveReviewContent: ({ request }: { request: EmployeeRequest }) =>
    React.createElement('div', { 'data-testid': 'leave-review-content' }, `Leave review for ${request.employee_name}`),
}))

vi.mock('../vacation-review-content', () => ({
  VacationReviewContent: ({ request }: { request: EmployeeRequest }) =>
    React.createElement('div', { 'data-testid': 'vacation-review-content' }, `Vacation review for ${request.employee_name}`),
}))

import { ReviewRequestDialog } from '../review-request-dialog'

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: '01HZTEST00000001',
    employee_id: '01HZTEST00000002',
    employee_name: 'Ana García',
    avatar_url: null,
    type: 'EXTRA_DAY',
    status: 'PENDING',
    payload: {
      date: '2026-06-15',
      salary_pct: 100,
      salary_day: 200,
      prima_pct: 100,
      prima: 200,
      seventh_day: 200,
      total: 600,
    },
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

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn })
  mockWatch.mockImplementation((field: string) => {
    if (field === 'salary_type') return 'registered'
    if (field === 'prima_type') return 'legal'
    if (field === 'reject_reason') return ''
    return undefined
  })
})

describe('ReviewRequestDialog — closed state', () => {
  it('renders nothing when request is null', () => {
    render(<ReviewRequestDialog request={null} onClose={vi.fn()} />)
    expect(screen.queryByTestId('slide-panel')).toBeNull()
  })
})

describe('ReviewRequestDialog — open state', () => {
  it('renders SlidePanel when request is provided', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByTestId('slide-panel')).toBeDefined()
  })

  it('sets panel title to employee name', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByTestId('panel-title').textContent).toContain('Ana García')
  })

  it('renders approve button', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Aprobar acuerdo')).toBeDefined()
  })

  it('renders reject button', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Rechazar')).toBeDefined()
  })

  it('renders formatted salary summary values', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0)
  })

  it('renders total amount', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getAllByText('$600.00').length).toBeGreaterThan(0)
  })
})

describe('ReviewRequestDialog — employee proposal section', () => {
  it('shows prima percentage from payload', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText(/Prima: 100%/)).toBeDefined()
  })

  it('shows request notes when present', () => {
    const request = makeRequest({ notes: 'Necesito el pago urgente' })
    render(<ReviewRequestDialog request={request} onClose={vi.fn()} />)
    expect(screen.getByText(/"Necesito el pago urgente"/)).toBeDefined()
  })

  it('does not render notes element when notes is null', () => {
    render(<ReviewRequestDialog request={makeRequest({ notes: null })} onClose={vi.fn()} />)
    expect(screen.queryByText(/Necesito/)).toBeNull()
  })
})

describe('ReviewRequestDialog — reject confirm dialog', () => {
  it('does not show ConfirmDialog initially', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()
  })

  it('calls setShowRejectConfirm(true) when Rechazar is clicked', () => {
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Rechazar'))
    expect(mockSetShowRejectConfirm).toHaveBeenCalledWith(true)
  })

  it('shows ConfirmDialog when showRejectConfirm is true', () => {
    mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn, showRejectConfirm: true })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByTestId('confirm-dialog')).toBeDefined()
  })

  it('calls handleReject when confirm button is clicked', () => {
    mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn, showRejectConfirm: true })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('confirm-btn'))
    expect(mockHandleReject).toHaveBeenCalled()
  })

  it('calls setShowRejectConfirm(false) when cancel button is clicked', () => {
    mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn, showRejectConfirm: true })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('close-confirm-btn'))
    expect(mockSetShowRejectConfirm).toHaveBeenCalledWith(false)
  })
})

describe('ReviewRequestDialog — agreed salary type', () => {
  it('renders percentage input when salary_type is agreed', () => {
    mockWatch.mockImplementation((field: string) => {
      if (field === 'salary_type') return 'agreed'
      if (field === 'prima_type') return 'legal'
      if (field === 'reject_reason') return ''
      return undefined
    })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getAllByTestId('number-input').length).toBeGreaterThan(0)
  })
})

describe('ReviewRequestDialog — agreed prima type', () => {
  it('renders percentage input when prima_type is agreed', () => {
    mockWatch.mockImplementation((field: string) => {
      if (field === 'salary_type') return 'registered'
      if (field === 'prima_type') return 'agreed'
      if (field === 'reject_reason') return ''
      return undefined
    })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getAllByTestId('number-input').length).toBeGreaterThan(0)
  })
})

describe('ReviewRequestDialog — loading states', () => {
  it('shows spinner when isApproving is true', () => {
    mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn, isApproving: true })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByTestId('spinner')).toBeDefined()
  })

  it('disables buttons while approving', () => {
    mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn, isApproving: true })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    const rejectBtn = screen.getByText('Rechazar') as HTMLButtonElement
    expect(rejectBtn.disabled).toBe(true)
  })
})

describe('ReviewRequestDialog — form error states', () => {
  it('shows salary_pct validation error when form has salary_pct error', () => {
    mockUseReviewRequestDialog.mockReturnValue({
      ...defaultHookReturn,
      form: {
        ...defaultHookReturn.form,
        formState: { errors: { salary_pct: { message: 'Debe ser entre 0 y 100', type: 'max' } } },
      },
    })
    mockWatch.mockImplementation((field: string) => {
      if (field === 'salary_type') return 'agreed'
      if (field === 'prima_type') return 'legal'
      if (field === 'reject_reason') return ''
      return undefined
    })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Debe ser entre 0 y 100')).toBeDefined()
  })

  it('shows prima_pct validation error when form has prima_pct error', () => {
    mockUseReviewRequestDialog.mockReturnValue({
      ...defaultHookReturn,
      form: {
        ...defaultHookReturn.form,
        formState: { errors: { prima_pct: { message: 'Máximo 200%', type: 'max' } } },
      },
    })
    mockWatch.mockImplementation((field: string) => {
      if (field === 'salary_type') return 'registered'
      if (field === 'prima_type') return 'agreed'
      if (field === 'reject_reason') return ''
      return undefined
    })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    expect(screen.getByText('Máximo 200%')).toBeDefined()
  })
})

describe('ReviewRequestDialog — reject reason textarea onChange', () => {
  it('calls setValue when reject reason textarea changes', () => {
    mockUseReviewRequestDialog.mockReturnValue({ ...defaultHookReturn, showRejectConfirm: true })
    render(<ReviewRequestDialog request={makeRequest()} onClose={vi.fn()} />)
    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    const rejectTextarea = textareas[textareas.length - 1]!
    fireEvent.change(rejectTextarea, { target: { value: 'No aplica' } })
    expect(mockSetValue).toHaveBeenCalledWith('reject_reason', 'No aplica')
  })
})

describe('ReviewRequestDialog — LEAVE type', () => {
  it('renders LeaveReviewContent instead of the extra-day form for type=LEAVE', () => {
    const request = makeRequest({ type: 'LEAVE', employee_name: 'Ana García' })
    render(<ReviewRequestDialog request={request} onClose={vi.fn()} />)

    expect(screen.getByTestId('leave-review-content')).toBeDefined()
    expect(screen.getByText('Leave review for Ana García')).toBeDefined()
  })

  it('does not render the extra-day salary/prima form for type=LEAVE', () => {
    const request = makeRequest({ type: 'LEAVE' })
    render(<ReviewRequestDialog request={request} onClose={vi.fn()} />)

    expect(screen.queryByText('Salario del día')).toBeNull()
    expect(screen.queryByText('Aprobar acuerdo')).toBeNull()
  })

  it('renders the extra-day form for type=EXTRA_DAY (unaffected)', () => {
    const request = makeRequest({ type: 'EXTRA_DAY' })
    render(<ReviewRequestDialog request={request} onClose={vi.fn()} />)

    expect(screen.queryByTestId('leave-review-content')).toBeNull()
    expect(screen.getByText('Aprobar acuerdo')).toBeDefined()
  })
})

describe('ReviewRequestDialog — VACATION type', () => {
  it('renders VacationReviewContent instead of the extra-day form for type=VACATION', () => {
    const request = makeRequest({ type: 'VACATION', employee_name: 'Ana García' })
    render(<ReviewRequestDialog request={request} onClose={vi.fn()} />)

    expect(screen.getByTestId('vacation-review-content')).toBeDefined()
    expect(screen.getByText('Vacation review for Ana García')).toBeDefined()
  })

  it('does not render the extra-day salary/prima form for type=VACATION', () => {
    const request = makeRequest({ type: 'VACATION' })
    render(<ReviewRequestDialog request={request} onClose={vi.fn()} />)

    expect(screen.queryByText('Salario del día')).toBeNull()
    expect(screen.queryByText('Aprobar acuerdo')).toBeNull()
  })
})
