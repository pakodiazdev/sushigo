/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { StockMovement, StockMovementSummary } from '../../types'
import { MovementsPage } from '../movements-page'

const mocks = vi.hoisted(() => ({ hook: vi.fn() }))

vi.mock('../../hooks/use-movements-page', () => ({ useMovementsPage: mocks.hook }))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: Object.assign(
    ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
      isOpen ? (
        <div role="dialog" aria-label={title}>
          {children}
        </div>
      ) : null,
    { Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
  ),
}))

vi.mock('@/components/ui/search-input', () => ({
  SearchInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Buscar" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const summary = (over: Partial<StockMovementSummary> = {}): StockMovementSummary => ({
  id: 'm1',
  reason: 'PURCHASE_RECEIPT',
  status: 'POSTED',
  direction: 'entry',
  is_reversal: false,
  quantity: 5,
  reference: 'DOC-1',
  from_location: null,
  to_location: { id: 'l1', name: 'Bodega' },
  variant: { id: 'v1', code: 'VAR-1', name: 'Salmón', base_uom: null },
  actor: { id: 1, name: 'Ana' },
  source: null,
  posted_at: '2026-08-10T10:00:00+00:00',
  created_at: '2026-08-10T10:00:00+00:00',
  updated_at: '2026-08-10T10:00:00+00:00',
  ...over,
})

const detail = (over: Partial<StockMovement> = {}): StockMovement => ({
  ...summary(),
  notes: null,
  reverses: null,
  reversed_by: null,
  reversed_at: null,
  reversal_reason: null,
  ...over,
})

function hookState(over: Partial<ReturnType<typeof buildDefault>> = {}) {
  return { ...buildDefault(), ...over }
}

function buildDefault() {
  return {
    movements: [summary()] as StockMovementSummary[],
    isLoading: false,
    isError: false,
    isForbidden: false,
    page: 1,
    totalPages: 1,
    totalResults: 1,
    setPage: vi.fn(),
    filters: {
      location_id: '',
      item_variant_id: '',
      reason: '',
      status: '',
      date_from: '',
      date_to: '',
      search: '',
      source_type: '',
    },
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    hasActiveFilters: false,
    locationOptions: [],
    variantOptions: [],
    selectedMovement: null as StockMovement | null,
    isDetailLoading: false,
    isDetailOpen: false,
    openMovement: vi.fn(),
    closeMovement: vi.fn(),
  }
}

describe('MovementsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders a ledger row and opens its detail on row click', () => {
    const openMovement = vi.fn()
    mocks.hook.mockReturnValue(hookState({ openMovement }))

    render(<MovementsPage />)

    expect(screen.getByText('Salmón (VAR-1)')).toBeDefined()
    fireEvent.click(screen.getByText('Salmón (VAR-1)'))
    expect(openMovement).toHaveBeenCalledWith('m1')
  })

  it('shows the permission-denied message when the list 403s', () => {
    mocks.hook.mockReturnValue(hookState({ movements: [], isError: true, isForbidden: true }))
    render(<MovementsPage />)
    expect(screen.getByText(/No tienes permiso/)).toBeDefined()
  })

  it('shows a generic error message on a non-permission failure', () => {
    mocks.hook.mockReturnValue(hookState({ movements: [], isError: true }))
    render(<MovementsPage />)
    expect(screen.getByText(/No fue posible cargar los movimientos/)).toBeDefined()
  })

  it('shows the empty-filter message when there are no rows', () => {
    mocks.hook.mockReturnValue(hookState({ movements: [] }))
    render(<MovementsPage />)
    expect(screen.getByText(/No hay movimientos que coincidan/)).toBeDefined()
  })

  it('renders the detail panel when a movement is selected', () => {
    mocks.hook.mockReturnValue(
      hookState({ isDetailOpen: true, selectedMovement: detail({ notes: 'nota visible' }) })
    )
    render(<MovementsPage />)
    expect(screen.getByRole('dialog', { name: 'Detalle del movimiento' })).toBeDefined()
    expect(screen.getByText('nota visible')).toBeDefined()
  })

  it('offers a clear-filters control only when a filter is active', () => {
    const clearFilters = vi.fn()
    mocks.hook.mockReturnValue(hookState({ hasActiveFilters: true, clearFilters }))
    render(<MovementsPage />)
    fireEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }))
    expect(clearFilters).toHaveBeenCalled()
  })
})
