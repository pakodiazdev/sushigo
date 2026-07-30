// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import React from 'react'
import type { Employee } from '@/types/employee'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }: { children: React.ReactNode; onClick?: () => void; type?: string }) => (
    <button type={(type ?? 'button') as 'button' | 'submit' | 'reset'} onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/employees/extra-day-form', () => ({
  ExtraDayForm: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="extra-day-form">ExtraDayForm</div> : null,
}))

vi.mock('@/lib/utils', () => ({ cn: (...cls: string[]) => cls.filter(Boolean).join(' ') }))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: React.ReactNode) => node }
})

const mockCan = vi.fn()
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { can: (p: string) => boolean }) => unknown) =>
    selector({ can: (p: string) => mockCan(p) }),
}))

const mockCancelMutate = vi.fn()
vi.mock('@/services/negotiated-extra-day-hooks', () => ({
  useCancelNegotiatedExtraDay: () => ({ mutate: mockCancelMutate, isPending: false, variables: undefined }),
}))

vi.mock('@/components/ui/use-dialog-transition', () => ({
  useDialogTransition: (isOpen: boolean) => ({ visible: isOpen, backdropCls: '', panelCls: '' }),
}))

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    isOpen,
    onConfirm,
    onClose,
    title,
    confirmLabel,
  }: {
    isOpen: boolean
    onConfirm: () => void
    onClose: () => void
    title: string
    confirmLabel: string
  }) =>
    isOpen
      ? (
        <div data-testid="confirm-dialog">
          <p>{title}</p>
          <button data-testid="confirm-btn" onClick={onConfirm}>{confirmLabel}</button>
          <button data-testid="cancel-btn" onClick={onClose}>No</button>
        </div>
        )
      : null,
}))

const mockUseNegotiatedExtraDays = vi.fn()
vi.mock('../use-negotiated-extra-days', () => ({
  useNegotiatedExtraDays: (...args: unknown[]) => mockUseNegotiatedExtraDays(...args),
}))

import { ExtraDaySection } from '../extra-day-section'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employee = {
  id: 'emp-1',
  user: { first_name: 'Ana', last_name: 'López' },
} as unknown as Employee

function defaultHookCtx(overrides = {}) {
  return {
    thisMonthCount: 0,
    upcomingCount: 0,
    upcomingDays: [],
    isLoadingSummary: false,
    showHistory: false,
    openHistory: vi.fn(),
    closeHistory: vi.fn(),
    historyExtraDays: [],
    historyMeta: undefined,
    historyIsLoading: false,
    historyFilters: {},
    setHistoryFilters: vi.fn(),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExtraDaySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('hides empty-state text while data is loading', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({ isLoadingSummary: true }))

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText('Sin días extra registrados')).toBeNull()
  })

  it('shows empty state when no extra days and not loading', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Sin días extra registrados')).toBeTruthy()
  })

  it('hides the "+ Día extra" button when user lacks approve permission', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText('Día extra')).toBeNull()
  })

  it('shows the "+ Día extra" button when user has approve permission', () => {
    mockCan.mockImplementation((p: string) => p === 'employee-requests.approve')
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Día extra')).toBeTruthy()
  })

  it('opens ExtraDayForm when button is clicked', () => {
    mockCan.mockImplementation((p: string) => p === 'employee-requests.approve')
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByTestId('extra-day-form')).toBeNull()

    fireEvent.click(screen.getByText('Día extra'))

    expect(screen.getByTestId('extra-day-form')).toBeTruthy()
  })

  it('shows upcoming day row when upcomingDays is non-empty', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({
      upcomingCount: 1,
      upcomingDays: [{
        id: 'ned-1',
        date: '2026-06-15',
        agreed_daily_wage: '800.00',
        prima_percent: 75,
        notes: null,
        created_at: '2026-04-25T00:00:00Z',
      }],
    }))

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Próximos días extra')).toBeTruthy()
    expect(screen.getByText('Prima 75%')).toBeTruthy()
  })

  it('passes employeeId to useNegotiatedExtraDays', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(mockUseNegotiatedExtraDays).toHaveBeenCalledWith('emp-1')
  })

  it('calls openHistory when "Ver historial" button is clicked', () => {
    mockCan.mockReturnValue(false)
    const openHistory = vi.fn()
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({ openHistory }))

    render(<ExtraDaySection employee={employee} />)
    fireEvent.click(screen.getByText('Ver historial'))

    expect(openHistory).toHaveBeenCalled()
  })

  it('shows loading skeleton when isLoadingSummary is true', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({ isLoadingSummary: true }))

    render(<ExtraDaySection employee={employee} />)

    // Skeleton placeholder divs are rendered — no chips visible
    expect(screen.queryByText('0 este mes')).toBeNull()
  })

  it('shows thisMonthCount chip when not loading', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({ thisMonthCount: 3 }))

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('3 este mes')).toBeTruthy()
  })
})

// ── History dialog ─────────────────────────────────────────────────────────────

const historyDay = {
  id: 'ned-h1',
  employee_id: 'emp-1',
  branch_id: 1,
  date: '2026-03-15',
  agreed_daily_wage: 800,
  prima_percent: 75,
  prima_amount: 600,
  approved_by: 'mgr-1',
  status: 'APPROVED' as const,
  notes: 'Buen trabajo',
}

describe('ExtraDayHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  function renderWithHistory(overrides = {}) {
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({
      showHistory: true,
      ...overrides,
    }))
    render(<ExtraDaySection employee={employee} />)
  }

  it('renders "Historial de días extra" heading when open', () => {
    renderWithHistory()
    expect(screen.getByText('Historial de días extra')).toBeTruthy()
  })

  it('does NOT render history dialog when showHistory is false', () => {
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({ showHistory: false }))
    render(<ExtraDaySection employee={employee} />)
    expect(screen.queryByText('Historial de días extra')).toBeNull()
  })

  it('shows loading skeleton when historyIsLoading is true', () => {
    renderWithHistory({ historyIsLoading: true, historyExtraDays: [] })
    // 3 skeleton div placeholders are rendered; table should not appear
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows empty state when no history records', () => {
    renderWithHistory({ historyIsLoading: false, historyExtraDays: [] })
    expect(screen.getByText('No se encontraron días extra')).toBeTruthy()
  })

  it('renders table rows for each history record', () => {
    renderWithHistory({ historyIsLoading: false, historyExtraDays: [historyDay] })
    expect(screen.getByText('Buen trabajo')).toBeTruthy()
    expect(screen.getByText('75%')).toBeTruthy()
  })

  it('shows meta total count when meta is provided', () => {
    renderWithHistory({
      historyIsLoading: false,
      historyExtraDays: [historyDay],
      historyMeta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    })
    expect(screen.getByText('1 registro')).toBeTruthy()
  })

  it('shows "registros" (plural) for meta.total > 1', () => {
    renderWithHistory({
      historyIsLoading: false,
      historyExtraDays: [historyDay],
      historyMeta: { current_page: 1, last_page: 1, per_page: 15, total: 5 },
    })
    expect(screen.getByText('5 registros')).toBeTruthy()
  })

  it('calls closeHistory when X button is clicked', () => {
    const closeHistory = vi.fn()
    renderWithHistory({ closeHistory })
    fireEvent.click(screen.getByLabelText('Cerrar'))
    expect(closeHistory).toHaveBeenCalled()
  })

  it('calls setHistoryFilters when date_from input changes', () => {
    const setHistoryFilters = vi.fn()
    renderWithHistory({ setHistoryFilters, historyFilters: {} })
    const input = screen.getByLabelText('Desde')
    fireEvent.change(input, { target: { value: '2026-01-01' } })
    expect(setHistoryFilters).toHaveBeenCalledWith(expect.objectContaining({ date_from: '2026-01-01' }))
  })

  it('calls setHistoryFilters with cleared date when date_from is cleared', () => {
    const setHistoryFilters = vi.fn()
    renderWithHistory({ setHistoryFilters, historyFilters: { date_from: '2026-01-01' } })
    const input = screen.getByLabelText('Desde')
    fireEvent.change(input, { target: { value: '' } })
    expect(setHistoryFilters).toHaveBeenCalledWith(expect.not.objectContaining({ date_from: expect.anything() }))
  })

  it('shows Limpiar button when a date filter is active', () => {
    renderWithHistory({ historyFilters: { date_from: '2026-01-01' } })
    expect(screen.getByText('Limpiar')).toBeTruthy()
  })

  it('calls setHistoryFilters with {} when Limpiar is clicked', () => {
    const setHistoryFilters = vi.fn()
    renderWithHistory({ setHistoryFilters, historyFilters: { date_from: '2026-01-01' } })
    fireEvent.click(screen.getByText('Limpiar'))
    expect(setHistoryFilters).toHaveBeenCalledWith({})
  })

  it('shows cancel button in table for future days when canCancel is true', () => {
    const futureDay = { ...historyDay, date: '2099-06-15' }
    renderWithHistory({ historyIsLoading: false, historyExtraDays: [futureDay] })
    expect(screen.getByLabelText('Cancelar día extra')).toBeTruthy()
  })

  it('calls cancelMutation when cancel confirmed in history table', () => {
    const futureDay = { ...historyDay, id: 'ned-future', date: '2099-06-15' }
    renderWithHistory({ historyIsLoading: false, historyExtraDays: [futureDay] })
    fireEvent.click(screen.getByLabelText('Cancelar día extra'))
    fireEvent.click(screen.getByTestId('confirm-btn'))
    expect(mockCancelMutate).toHaveBeenCalledWith('ned-future')
  })
})
