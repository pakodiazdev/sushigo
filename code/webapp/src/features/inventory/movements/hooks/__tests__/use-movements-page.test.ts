/** @vitest-environment jsdom */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockMovement, StockMovementSummary } from '../../types'

const mockShowError = vi.fn()
vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}))

let currentSearch: Record<string, unknown> = {}
const mockNavigate = vi.fn((options: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
  if (typeof options.search === 'function') {
    currentSearch = options.search(currentSearch)
  }
})
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => currentSearch,
  useNavigate: () => mockNavigate,
}))

vi.mock('../../api/movement-api', () => ({
  movementApi: { list: vi.fn(), get: vi.fn() },
}))

const mockCan = vi.fn((_permission: string) => true)
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { can: (p: string) => boolean }) => unknown) =>
    selector({ can: mockCan }),
}))

const mockLocationsSelect = vi.fn()
const mockVariantsSelect = vi.fn()
vi.mock('@/hooks/use-inventory-queries', () => ({
  useInventoryLocationsSelect: (enabled: boolean) => mockLocationsSelect(enabled),
  useItemVariantsSelect: (enabled: boolean) => mockVariantsSelect(enabled),
}))

import { movementApi } from '../../api/movement-api'
import { useMovementsPage } from '../use-movements-page'

type ListResult = Awaited<ReturnType<typeof movementApi.list>>
type EntityResult = Awaited<ReturnType<typeof movementApi.get>>

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

const full = (over: Partial<StockMovement> = {}): StockMovement => ({
  ...summary(),
  notes: null,
  reverses: null,
  reversed_by: null,
  reversed_at: null,
  reversal_reason: null,
  ...over,
})

const listResult = (data: StockMovementSummary[], meta = {}): ListResult =>
  ({
    data: { status: 200, data, meta: { current_page: 1, last_page: 1, per_page: 15, total: data.length, ...meta } },
  }) as unknown as ListResult

const entityResult = (m: StockMovement): EntityResult =>
  ({ data: { status: 200, data: m } }) as unknown as EntityResult

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMovementsPage', () => {
  beforeEach(() => {
    mockCan.mockImplementation(() => true)
    mockLocationsSelect.mockReturnValue({ data: [] })
    mockVariantsSelect.mockReturnValue({ data: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    currentSearch = {}
  })

  it('loads the ledger page and exposes totals from meta', async () => {
    vi.mocked(movementApi.list).mockResolvedValue(
      listResult([summary(), summary({ id: 'm2' })], { last_page: 4, total: 55 })
    )

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.movements).toHaveLength(2))
    expect(result.current.totalPages).toBe(4)
    expect(result.current.totalResults).toBe(55)
  })

  it('forwards the URL filter params to the list endpoint', async () => {
    currentSearch = {
      page: 2,
      location_id: 'loc-ulid',
      item_variant_id: 'var-ulid',
      reason: 'TRANSFER',
      status: 'POSTED',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
      search: 'DOC',
      source_type: 'receipt',
    }
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))

    renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    await waitFor(() =>
      expect(movementApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          per_page: 15,
          location_id: 'loc-ulid',
          item_variant_id: 'var-ulid',
          reason: 'TRANSFER',
          status: 'POSTED',
          date_from: '2026-08-01',
          date_to: '2026-08-31',
          search: 'DOC',
          source_type: 'receipt',
        })
      )
    )
  })

  it('writes a filter change to the URL and drops the stale page', async () => {
    currentSearch = { page: 3 }
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(movementApi.list).toHaveBeenCalled())

    act(() => result.current.setFilter('reason', 'SALE'))

    expect(mockNavigate).toHaveBeenCalled()
    expect(currentSearch).toMatchObject({ reason: 'SALE' })
    expect(currentSearch).not.toHaveProperty('page')
  })

  it('flags a 403 from the list endpoint as a permission-denied state', async () => {
    const forbidden = new AxiosError('Forbidden')
    forbidden.response = { status: 403 } as AxiosError['response']
    vi.mocked(movementApi.list).mockRejectedValue(forbidden)

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isForbidden).toBe(true))
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it('surfaces a non-403 list failure through the error toast', async () => {
    vi.mocked(movementApi.list).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    expect(result.current.isForbidden).toBe(false)
  })

  it('keeps the user on their page when a later-page request fails, instead of resetting to page 1', async () => {
    currentSearch = { page: 3 }
    vi.mocked(movementApi.list).mockRejectedValue(new Error('page 3 blew up'))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(currentSearch).toHaveProperty('page', 3)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('clamps back to page 1 when a successful refetch reports fewer pages than the current page', async () => {
    currentSearch = { page: 5 }
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()], { last_page: 2 }))

    renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    expect(currentSearch).not.toHaveProperty('page')
  })

  it('fetches the full movement when one is deep-linked in the URL', async () => {
    currentSearch = { movement: 'm1' }
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))
    vi.mocked(movementApi.get).mockResolvedValue(entityResult(full({ notes: 'short shipment' })))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    expect(result.current.isDetailOpen).toBe(true)
    await waitFor(() => expect(movementApi.get).toHaveBeenCalledWith('m1'))
    await waitFor(() => expect(result.current.selectedMovement?.notes).toBe('short shipment'))
  })

  it('does not fetch a detail when no movement is selected', async () => {
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.movements).toHaveLength(1))

    expect(movementApi.get).not.toHaveBeenCalled()
    expect(result.current.isDetailOpen).toBe(false)
  })

  it('opens and closes the detail by writing the movement id to the URL', async () => {
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.movements).toHaveLength(1))

    act(() => result.current.openMovement('m9'))
    expect(currentSearch).toMatchObject({ movement: 'm9' })

    act(() => result.current.closeMovement())
    expect(currentSearch).not.toHaveProperty('movement')
  })

  it('reports active filters and clears them all at once, including source_type', async () => {
    currentSearch = { reason: 'SALE', status: 'POSTED', search: 'X', source_type: 'receipt' }
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.hasActiveFilters).toBe(true))

    act(() => result.current.clearFilters())

    expect(currentSearch).not.toHaveProperty('reason')
    expect(currentSearch).not.toHaveProperty('status')
    expect(currentSearch).not.toHaveProperty('search')
    expect(currentSearch).not.toHaveProperty('source_type')
  })

  it('only requests the Location/Variant option catalogs when the caller may read them', async () => {
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))
    mockCan.mockImplementation((p: string) => p === 'stock.view')

    renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    expect(mockLocationsSelect).toHaveBeenLastCalledWith(false)
    expect(mockVariantsSelect).toHaveBeenLastCalledWith(false)
  })

  it('enables the option catalogs for a caller holding the catalog permissions', async () => {
    vi.mocked(movementApi.list).mockResolvedValue(listResult([summary()]))
    mockCan.mockImplementation((p: string) => ['stock.view', 'inventory_locations.view', 'items.view'].includes(p))

    renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })

    expect(mockLocationsSelect).toHaveBeenLastCalledWith(true)
    expect(mockVariantsSelect).toHaveBeenLastCalledWith(true)
  })

  it('seeds the Location/Variant options from the movements on screen when the catalog is unavailable', async () => {
    mockCan.mockImplementation((p: string) => p === 'stock.view')
    mockLocationsSelect.mockReturnValue({ data: [] })
    mockVariantsSelect.mockReturnValue({ data: [] })
    vi.mocked(movementApi.list).mockResolvedValue(
      listResult([
        summary({ id: 'm1', to_location: { id: 'l1', name: 'Bodega' } }),
        summary({
          id: 'm2',
          from_location: { id: 'l2', name: 'Barra' },
          to_location: null,
          variant: { id: 'v9', code: 'VAR-9', name: 'Atún', base_uom: null },
        }),
      ])
    )

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.movements).toHaveLength(2))

    expect(result.current.locationOptions).toEqual([
      { id: 'l2', name: 'Barra' },
      { id: 'l1', name: 'Bodega' },
    ])
    expect(result.current.variantOptions.map((v) => v.id).sort()).toEqual(['v1', 'v9'])
  })

  it('merges catalog options with on-screen refs without duplicating shared ids', async () => {
    mockLocationsSelect.mockReturnValue({ data: [{ id: 'l1', name: 'Bodega' }, { id: 'l3', name: 'Almacén' }] })
    vi.mocked(movementApi.list).mockResolvedValue(
      listResult([summary({ to_location: { id: 'l1', name: 'Bodega' } })])
    )

    const { result } = renderHook(() => useMovementsPage(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.movements).toHaveLength(1))

    expect(result.current.locationOptions).toEqual([
      { id: 'l3', name: 'Almacén' },
      { id: 'l1', name: 'Bodega' },
    ])
  })
})
