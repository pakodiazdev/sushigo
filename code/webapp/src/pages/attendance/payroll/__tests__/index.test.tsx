// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import type { PayPeriodListItem, PayPeriodListMeta } from '@/types/attendance-payroll'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({ component: null }),
  Link: ({ children, ...props }: Record<string, unknown>) => {
    const { to, params, className } = props as { to: string; params: Record<string, string>; className: string }
    const href = Object.entries(params ?? {}).reduce((acc, [key, value]) => acc.replace(`$${key}`, value), to)
    return <a href={href} className={className}>{children as React.ReactNode}</a>
  },
}))

vi.mock('@/lib/route-guards', () => ({
  requirePermission: () => () => undefined,
}))

const mockUsePayPeriodsListPage = vi.fn()

vi.mock('../use-pay-periods-list', () => ({
  usePayPeriodsListPage: () => mockUsePayPeriodsListPage(),
}))

import { PayPeriodsListPage } from '../index'

const PERIODS: PayPeriodListItem[] = [
  {
    id: 'PERIOD-1',
    branch_id: 1,
    period_start: '2026-06-22',
    period_end: '2026-06-28',
    status: 'CLOSED',
    closed_by: 'admin@sushigo.com',
    closed_at: '2026-06-29T01:00:00Z',
    reopened_by: null,
    reopened_at: null,
    reopen_reason: null,
    total_employees: 2,
  },
  {
    id: 'PERIOD-2',
    branch_id: 1,
    period_start: '2026-06-15',
    period_end: '2026-06-21',
    status: 'REOPENED',
    closed_by: null,
    closed_at: null,
    reopened_by: null,
    reopened_at: null,
    reopen_reason: null,
    total_employees: 3,
  },
]

const META: PayPeriodListMeta = { current_page: 1, last_page: 3, per_page: 15, total: 32 }

function baseHookReturn(overrides: Partial<ReturnType<typeof buildDefaultHookReturn>> = {}) {
  return { ...buildDefaultHookReturn(), ...overrides }
}

function buildDefaultHookReturn() {
  return {
    hasBranch: true,
    status: '' as const,
    setStatus: vi.fn(),
    periodStart: '',
    setPeriodStart: vi.fn(),
    periodEnd: '',
    setPeriodEnd: vi.fn(),
    periods: PERIODS,
    meta: META,
    setPage: vi.fn(),
    isLoading: false,
    errorMessage: null as string | null,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  mockUsePayPeriodsListPage.mockReturnValue(baseHookReturn())
})

describe('PayPeriodsListPage', () => {
  it('shows the no-branch state when there is no current branch', () => {
    mockUsePayPeriodsListPage.mockReturnValue(baseHookReturn({ hasBranch: false }))
    render(<PayPeriodsListPage />)

    expect(screen.getByText('Sin sucursal seleccionada')).toBeDefined()
    expect(screen.queryByText('2026-06-22 — 2026-06-28')).toBeNull()
  })

  it('renders each period through the shared DataGrid with its status, closer, and employee count', () => {
    render(<PayPeriodsListPage />)

    const row = screen.getByText('2026-06-22 — 2026-06-28').closest('tr')
    expect(row).not.toBeNull()
    const utils = within(row as HTMLElement)

    expect(utils.getByText('Cerrado')).toBeDefined()
    expect(utils.getByText('admin@sushigo.com')).toBeDefined()
    expect(utils.getByText('2')).toBeDefined()

    const openRow = screen.getByText('2026-06-15 — 2026-06-21').closest('tr')
    expect(within(openRow as HTMLElement).getAllByText('—')).toHaveLength(2)
  })

  it('shows the empty message when there are no periods and no error', () => {
    mockUsePayPeriodsListPage.mockReturnValue(baseHookReturn({ periods: [], meta: { ...META, total: 0, last_page: 1 } }))
    render(<PayPeriodsListPage />)

    expect(screen.getByText('No hay periodos que coincidan con los filtros.')).toBeDefined()
  })

  it('shows the error message and does not render the grid when the query fails', () => {
    mockUsePayPeriodsListPage.mockReturnValue(baseHookReturn({ errorMessage: 'No se pudieron cargar los periodos de nómina.' }))
    render(<PayPeriodsListPage />)

    expect(screen.getByText('No se pudieron cargar los periodos de nómina.')).toBeDefined()
    expect(screen.queryByText('2026-06-22 — 2026-06-28')).toBeNull()
  })

  it('advances the page through DataGrid pagination', () => {
    const setPage = vi.fn()
    mockUsePayPeriodsListPage.mockReturnValue(baseHookReturn({ setPage }))
    render(<PayPeriodsListPage />)

    // DataGrid renders one pagination <nav> per responsive breakpoint (all present in the
    // DOM at once — jsdom doesn't evaluate the Tailwind media queries that hide the others).
    // Every copy wires to the same onPageChange, so clicking any "2" button proves the wiring
    // without depending on which nav a real browser would actually show.
    const pageTwoButtons = screen.getAllByRole('button', { name: '2' })
    expect(pageTwoButtons.length).toBeGreaterThan(0)

    fireEvent.click(pageTwoButtons[0]!)

    expect(setPage).toHaveBeenCalledWith(2)
  })
})
