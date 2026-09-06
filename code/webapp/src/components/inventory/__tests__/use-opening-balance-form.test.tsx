// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOpeningBalanceForm } from '../use-opening-balance-form'

const showSuccess = vi.fn()
const showError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess, showError }),
}))

// Real 400 ms debounce — the tests below `waitFor` past it. Keeping it real is
// what lets the "preview goes stale on a live edit" test observe the lag window.

// Stable references — the real hooks are backed by react-query, whose `data`
// identity is stable across renders. Returning fresh array literals here would
// re-fire the hook's variant→UoM effect every render and loop.
const MOCK_LOCATIONS = [{ id: 'loc-1', name: 'Central', type: 'MAIN' }]
const MOCK_VARIANTS = [
  {
    id: 'var-1',
    code: 'VAR-001',
    name: 'Rice 1kg',
    uom_id: 7,
    uom: { id: 'uom-kg', name: 'Kilogram', symbol: 'kg' },
    item: { sku: 'RIC-001', name: 'Rice' },
  },
]
const MOCK_UNITS = [{ id: 'uom-kg', name: 'Kilogram', symbol: 'kg', type: 'WEIGHT' }]

vi.mock('@/hooks/use-inventory-queries', () => ({
  useInventoryLocationsSelect: () => ({ data: MOCK_LOCATIONS }),
  useItemVariantsSelect: () => ({ data: MOCK_VARIANTS }),
  useUnitsOfMeasureSelect: () => ({ data: MOCK_UNITS }),
}))

vi.mock('@/services/inventory-api', () => ({
  stockMovementApi: {
    openingBalance: vi.fn(),
    openingBalancePreview: vi.fn(),
  },
}))

import { stockMovementApi } from '@/services/inventory-api'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return { Wrapper, invalidateSpy }
}

const PREVIEW = {
  entry_quantity: 25000,
  entry_uom: 'GR',
  base_quantity: 25,
  base_uom: 'KG',
  conversion_applies: true,
  conversion_factor: 0.001,
  entry_unit_cost: 0.15,
  base_unit_cost: 150,
  total_value: 3750,
}

describe('useOpeningBalanceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(stockMovementApi.openingBalancePreview).mockResolvedValue({
      data: { status: 200, data: PREVIEW },
    } as never)
    vi.mocked(stockMovementApi.openingBalance).mockResolvedValue({
      data: { status: 201, data: { id: 1 } },
    } as never)
  })
  afterEach(() => cleanup())

  it('does not request a preview until location, variant, uom and a positive quantity are all set', async () => {
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOpeningBalanceForm({ onSuccess: vi.fn() }),
      { wrapper: Wrapper }
    )

    // Nothing selected yet.
    await new Promise((r) => setTimeout(r, 0))
    expect(stockMovementApi.openingBalancePreview).not.toHaveBeenCalled()

    act(() => {
      result.current.setFieldValue('inventory_location_id', 'loc-1')
      result.current.setFieldValue('item_variant_id', 'var-1')
      result.current.setFieldValue('quantity', 25000)
    })
    // uom_id is auto-filled from the variant by the hook's effect.

    await waitFor(() => expect(stockMovementApi.openingBalancePreview).toHaveBeenCalled(), {
      timeout: 2000,
    })
    await waitFor(() => expect(result.current.preview).toEqual(PREVIEW), { timeout: 2000 })
  })

  it('hides the loaded preview and shows loading the instant a live edit outpaces the debounce', async () => {
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOpeningBalanceForm({ onSuccess: vi.fn() }),
      { wrapper: Wrapper }
    )

    act(() => {
      result.current.setFieldValue('inventory_location_id', 'loc-1')
      result.current.setFieldValue('item_variant_id', 'var-1')
      result.current.setFieldValue('quantity', 25000)
    })
    await waitFor(() => expect(result.current.preview).toEqual(PREVIEW), { timeout: 2000 })

    // A fresh edit: the previously-loaded preview is immediately withheld (its
    // total was computed for 25000, not 30000) until the debounce catches up.
    act(() => {
      result.current.setFieldValue('quantity', 30000)
    })
    expect(result.current.preview).toBeUndefined()
    expect(result.current.previewLoading).toBe(true)

    // Once the debounce settles, a fresh preview for the new input appears.
    await waitFor(() => expect(result.current.preview).toEqual(PREVIEW), { timeout: 2000 })
  })

  it('posts the opening balance and invalidates the Existencias queries on success', async () => {
    const onSuccess = vi.fn()
    const { Wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(
      () => useOpeningBalanceForm({ onSuccess }),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        inventory_location_id: 'loc-1',
        item_variant_id: 'var-1',
        quantity: 10,
        uom_id: 'uom-kg',
        unit_cost: 4,
        notes: '',
      })
    })

    expect(stockMovementApi.openingBalance).toHaveBeenCalledWith({
      inventory_location_id: 'loc-1',
      item_variant_id: 'var-1',
      quantity: 10,
      uom_id: 'uom-kg',
      unit_cost: 4,
      notes: undefined,
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey))
    expect(invalidatedKeys).toContain(JSON.stringify(['stock-all']))
    expect(invalidatedKeys).toContain(JSON.stringify(['stock-by-location']))
    expect(invalidatedKeys).toContain(JSON.stringify(['variant-assignments']))
  })

  it('forwards an explicit zero unit cost verbatim so the backend blends it', async () => {
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOpeningBalanceForm({ onSuccess: vi.fn() }),
      { wrapper: Wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        inventory_location_id: 'loc-1',
        item_variant_id: 'var-1',
        quantity: 10,
        uom_id: 'uom-kg',
        unit_cost: 0,
        notes: '',
      })
    })

    // 0 is a real cost (free stock) that still moves Stock.weighted_avg_cost;
    // it must not be collapsed to undefined, which the backend reads as "skip
    // the blend".
    expect(stockMovementApi.openingBalance).toHaveBeenCalledWith(
      expect.objectContaining({ unit_cost: 0 })
    )
  })

  it('sends the debounced unit cost to the preview endpoint verbatim (including 0)', async () => {
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOpeningBalanceForm({ onSuccess: vi.fn() }),
      { wrapper: Wrapper }
    )

    act(() => {
      result.current.setFieldValue('inventory_location_id', 'loc-1')
      result.current.setFieldValue('item_variant_id', 'var-1')
      result.current.setFieldValue('quantity', 10)
    })

    await waitFor(() => expect(stockMovementApi.openingBalancePreview).toHaveBeenCalled(), {
      timeout: 2000,
    })
    expect(stockMovementApi.openingBalancePreview).toHaveBeenLastCalledWith(
      expect.objectContaining({ unit_cost: 0 })
    )
  })

  it('exposes a Spanish preview error message when the preview request fails', async () => {
    vi.mocked(stockMovementApi.openingBalancePreview).mockRejectedValue({
      response: { data: { message: 'No conversion found from L to KG' } },
    })
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOpeningBalanceForm({ onSuccess: vi.fn() }),
      { wrapper: Wrapper }
    )

    act(() => {
      result.current.setFieldValue('inventory_location_id', 'loc-1')
      result.current.setFieldValue('item_variant_id', 'var-1')
      result.current.setFieldValue('quantity', 5)
    })

    await waitFor(() => expect(result.current.previewErrorMessage).toBeTruthy(), { timeout: 2000 })
  })
})
