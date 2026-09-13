/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forbiddenError } from '@/lib/__tests__/axios-error-fixtures'

const mocks = vi.hoisted(() => ({
  can: vi.fn((_p: string) => true),
  refetchStock: vi.fn(),
  refetchLocationStock: vi.fn(),
  stockState: {
    isLoading: false,
    isError: false,
    error: undefined as unknown,
    data: { data: { data: [] } } as { data: { data: unknown[] } } | undefined,
  },
  locationState: {
    isLoading: false,
    isError: false,
    error: undefined as unknown,
    data: undefined as unknown,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: unknown) => config,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'stock-all') {
      return {
        data: mocks.stockState.data,
        isLoading: mocks.stockState.isLoading,
        isError: mocks.stockState.isError,
        error: mocks.stockState.error,
        refetch: mocks.refetchStock,
      }
    }
    if (queryKey[0] === 'stock-by-location') {
      return {
        data: mocks.locationState.data,
        isLoading: mocks.locationState.isLoading,
        isError: mocks.locationState.isError,
        error: mocks.locationState.error,
        refetch: mocks.refetchLocationStock,
      }
    }
    if (queryKey[0] === 'inventory-locations-dashboard') {
      return {
        data: {
          data: {
            data: [{ id: 'loc1', name: 'Bodega Central', type: 'MAIN' }],
          },
        },
        isLoading: false,
      }
    }
    return { data: { data: { data: [] } }, isLoading: false }
  },
}))

vi.mock('@/lib/route-guards', () => ({ requirePermission: () => () => undefined }))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { can: (p: string) => boolean }) => unknown) =>
    selector({ can: mocks.can }),
}))

vi.mock('@/components/inventory', () => ({
  OpeningBalanceForm: () => <div data-testid="opening-balance-form" />,
}))

vi.mock('@/features/inventory/replenishment', () => ({
  ReplenishmentPoliciesPanel: () => <div data-testid="replenishment-panel" />,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="slide-panel">{children}</div> : null,
}))

import { StockDashboardPage } from '../existencias'

describe('Existencias — Opening Balance entry point (#570)', () => {
  beforeEach(() => {
    mocks.can.mockReset()
    mocks.can.mockImplementation(() => true)
    mocks.stockState.isLoading = false
    mocks.stockState.isError = false
    mocks.stockState.error = undefined
    mocks.stockState.data = { data: { data: [] } }
    mocks.locationState.isLoading = false
    mocks.locationState.isError = false
    mocks.locationState.error = undefined
    mocks.locationState.data = undefined
    mocks.refetchLocationStock.mockClear()
  })
  afterEach(() => cleanup())

  it('shows the "Registrar saldo inicial" action when the user has stock.manage + the catalog reads', () => {
    const { getAllByText } = render(<StockDashboardPage />)
    expect(getAllByText('Registrar saldo inicial').length).toBeGreaterThan(0)
  })

  it('hides the action for a stock.view-only user', () => {
    mocks.can.mockImplementation((p: string) => p !== 'stock.manage')
    const { queryByText } = render(<StockDashboardPage />)
    expect(queryByText('Registrar saldo inicial')).toBeNull()
    expect(mocks.can).toHaveBeenCalledWith('stock.manage')
  })

  it.each(['inventory_locations.view', 'items.view'])(
    'hides the action for a stock.manage user missing %s (the form selects would 403)',
    (missing) => {
      mocks.can.mockImplementation((p: string) => p !== missing)
      const { queryByText } = render(<StockDashboardPage />)
      expect(queryByText('Registrar saldo inicial')).toBeNull()
    }
  )

  it('opens the Opening Balance panel when the action is clicked', () => {
    const { getAllByText, getByTestId } = render(<StockDashboardPage />)
    const [trigger] = getAllByText('Registrar saldo inicial')
    fireEvent.click(trigger as HTMLElement)
    expect(getByTestId('slide-panel')).toBeDefined()
    expect(getByTestId('opening-balance-form')).toBeDefined()
  })

  it('shows a retry-offering error state instead of "Sin surtido configurado" on a genuine first-load failure (no cached data)', () => {
    mocks.stockState.isError = true
    mocks.stockState.data = undefined
    const { getByRole, queryByText } = render(<StockDashboardPage />)
    // Regression: a failed fetch must not render identically to "the assortment is
    // genuinely empty" — that used to show the same "Sin surtido configurado" CTA card.
    expect(queryByText('Sin surtido configurado')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Reintentar' }))
    expect(mocks.refetchStock).toHaveBeenCalledOnce()
  })

  it('does not fabricate zero summary totals on a genuine first-load failure', () => {
    mocks.stockState.isError = true
    mocks.stockState.data = undefined
    const { queryByText } = render(<StockDashboardPage />)
    expect(queryByText('Variantes asignadas')).toBeNull()
    expect(queryByText('Unidades disponibles')).toBeNull()
  })

  it('still shows "Sin surtido configurado" when the fetch succeeds with zero rows', () => {
    const { getByText } = render(<StockDashboardPage />)
    expect(getByText('Sin surtido configurado')).toBeDefined()
  })

  it('keeps showing last-known totals (not a blocking error) when a background refetch fails with cached data present', () => {
    mocks.stockState.isError = true
    mocks.stockState.data = {
      data: {
        data: [
          {
            assignment_id: 'a1',
            stock_id: 's1',
            inventory_location_id: 'loc1',
            on_hand: 10,
            reserved: 0,
            weighted_avg_cost: 5,
            is_low_stock: false,
            item_variant: { code: 'V1', name: 'Variant 1' },
            inventory_location: { name: 'Bodega' },
          },
        ],
      },
    }
    const { getByText, queryByRole } = render(<StockDashboardPage />)
    // The blocking full-page error state must not appear — data is still on hand.
    expect(queryByRole('button', { name: 'Reintentar' })).toBeNull()
    expect(getByText('Variantes asignadas')).toBeDefined()
    // A non-blocking stale-data notice takes its place instead.
    expect(getByText(/No se pudo actualizar/)).toBeDefined()
  })

  it('keeps showing the Location Detail View card (not a blocking error) when a refetch fails with cached data present', () => {
    // Simulates the render-time state a background refetch failure leaves behind: the
    // last successful snapshot is still cached (`data` populated) while `isError` is true.
    mocks.locationState.isError = true
    mocks.locationState.data = {
      data: {
        data: {
          inventory_location: { name: 'Bodega Central', type: 'MAIN', priority: 1 },
          summary: { total_variants: 3, total_on_hand: 10, total_available: 8, total_inventory_value: 500 },
          items: [
            {
              assignment_id: 'a1',
              item_variant_id: 'v1',
              item_variant_code: 'V1',
              item_variant_name: 'Variant 1',
              item_sku: 'SKU-1',
              stock_id: 's1',
              on_hand: 10,
              available: 8,
              total_value: 500,
              min_stock: 0,
              max_stock: 20,
              is_low_stock: false,
            },
          ],
        },
      },
    }
    const { getByRole, getByText, queryByText } = render(<StockDashboardPage />)

    fireEvent.change(getByRole('combobox'), { target: { value: 'loc1' } })

    // The card must still render its cached totals, not the blocking error state.
    expect(getByText('Bodega Central')).toBeDefined()
    expect(queryByText('No se pudo cargar esta ubicación')).toBeNull()
    expect(getByText(/No se pudo actualizar esta ubicación/)).toBeDefined()
  })

  it('blocks the assortment view on a 403 even with cached stock rows, instead of the stale-data notice', () => {
    // A background refetch that comes back 403 must never be treated as "transient" just
    // because `stockData` still holds the last successful snapshot.
    mocks.stockState.isError = true
    mocks.stockState.error = forbiddenError()
    mocks.stockState.data = {
      data: {
        data: [
          {
            assignment_id: 'a1',
            stock_id: 's1',
            inventory_location_id: 'loc1',
            on_hand: 10,
            reserved: 0,
            weighted_avg_cost: 5,
            is_low_stock: false,
            item_variant: { code: 'V1', name: 'Variant 1' },
            inventory_location: { name: 'Bodega' },
          },
        ],
      },
    }
    const { getByText, queryByText, queryByRole } = render(<StockDashboardPage />)
    expect(getByText('No tienes permiso para ver esta información')).toBeDefined()
    expect(queryByText('Variantes asignadas')).toBeNull()
    expect(queryByText(/No se pudo actualizar/)).toBeNull()
    expect(queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('blocks the Location Detail View on a 403 even with cached location stock, instead of the stale-data notice', () => {
    mocks.locationState.isError = true
    mocks.locationState.error = forbiddenError()
    mocks.locationState.data = {
      data: {
        data: {
          inventory_location: { name: 'Bodega Central', type: 'MAIN', priority: 1 },
          summary: { total_variants: 3, total_on_hand: 10, total_available: 8, total_inventory_value: 500 },
          items: [
            {
              assignment_id: 'a1',
              item_variant_id: 'v1',
              item_variant_code: 'V1',
              item_variant_name: 'Variant 1',
              item_sku: 'SKU-1',
              stock_id: 's1',
              on_hand: 10,
              available: 8,
              total_value: 500,
              min_stock: 0,
              max_stock: 20,
              is_low_stock: false,
            },
          ],
        },
      },
    }
    const { getByRole, getByText, queryByText } = render(<StockDashboardPage />)

    fireEvent.change(getByRole('combobox'), { target: { value: 'loc1' } })

    expect(getByText('No tienes permiso para ver esta información')).toBeDefined()
    expect(queryByText('Bodega Central')).toBeNull()
    expect(queryByText(/No se pudo actualizar esta ubicación/)).toBeNull()
  })
})
