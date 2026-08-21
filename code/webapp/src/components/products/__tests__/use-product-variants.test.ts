// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProductVariants } from '../use-product-variants'
import type { ProductVariant } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  productVariantApi: {
    list: vi.fn(),
  },
}))

import { productVariantApi } from '@/services/inventory-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const riceVariant: ProductVariant = {
  id: 7,
  item_id: 42,
  code: 'ARR-KG',
  barcode: null,
  name: 'Arroz Premium 1kg',
  description: null,
  uom: { id: 1, code: 'KG', name: 'Kilogram', symbol: 'kg' },
  track_lot: false,
  track_serial: false,
  is_active: true,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useProductVariants', () => {
  beforeEach(() => {
    vi.mocked(productVariantApi.list).mockResolvedValue({
      data: { status: 200, data: [riceVariant], meta: { current_page: 1, total: 1 } },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when productId is null', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useProductVariants(null, false), { wrapper })

    expect(productVariantApi.list).not.toHaveBeenCalled()
  })

  it('does not fetch while the panel is closed, even with a productId set', () => {
    // Guards a real bug: after a Product delete, selectedProduct/productId stays set until
    // the next open, so `enabled` must key off isPanelOpen too, or the invalidation that
    // follows the delete would refetch the now-deleted product's Variants and surface a
    // spurious error toast right after the delete success toast.
    const { wrapper } = makeWrapper()
    renderHook(() => useProductVariants(42, false), { wrapper })

    expect(productVariantApi.list).not.toHaveBeenCalled()
  })

  it('loads variants for the given product', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    await waitFor(() => expect(result.current.variants).toHaveLength(1))

    expect(productVariantApi.list).toHaveBeenCalledWith(42, { per_page: 100, page: 1 })
    expect(result.current.variants[0]!.name).toBe('Arroz Premium 1kg')
  })

  it('fetches every page instead of silently truncating past the first 100 variants', async () => {
    const pageTwoVariant = { ...riceVariant, id: 8, code: 'ARR-KG-2' }
    vi.mocked(productVariantApi.list).mockImplementation((_, params) => {
      const page = params?.page ?? 1
      return Promise.resolve({
        data: {
          status: 200,
          data: page === 1 ? [riceVariant] : [pageTwoVariant],
          meta: { current_page: page, total: 2, last_page: 2 },
        },
      } as never)
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    await waitFor(() => expect(result.current.variants).toHaveLength(2))

    expect(productVariantApi.list).toHaveBeenCalledWith(42, { per_page: 100, page: 1 })
    expect(productVariantApi.list).toHaveBeenCalledWith(42, { per_page: 100, page: 2 })
    expect(result.current.variants.map((v) => v.id)).toEqual([7, 8])
  })

  it('surfaces a toast when the variant list fails to load, instead of silently rendering empty', async () => {
    vi.mocked(productVariantApi.list).mockRejectedValue(new Error('Network Error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.variants).toEqual([])
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts in list mode', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    expect(result.current.variantMode).toBe('list')
    expect(result.current.selectedVariant).toBeNull()
  })

  it('opens a Variant in detail mode on click', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    act(() => result.current.handleVariantClick(riceVariant))

    expect(result.current.variantMode).toBe('detail')
    expect(result.current.selectedVariant).toEqual(riceVariant)
  })

  it('opens create mode on New Variant', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    act(() => result.current.handleVariantClick(riceVariant))
    act(() => result.current.handleNewVariant())

    expect(result.current.variantMode).toBe('create')
    expect(result.current.selectedVariant).toBeNull()
  })

  it('moves to edit mode, and cancelling edit returns to detail (not the list)', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    act(() => result.current.handleVariantClick(riceVariant))
    act(() => result.current.handleEditVariant())
    expect(result.current.variantMode).toBe('edit')

    act(() => result.current.cancelEditVariant())
    expect(result.current.variantMode).toBe('detail')
    expect(result.current.selectedVariant).toEqual(riceVariant)
  })

  it('goes back to the list and clears the selected variant', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    act(() => result.current.handleVariantClick(riceVariant))
    act(() => result.current.handleBackToList())

    expect(result.current.variantMode).toBe('list')
    expect(result.current.selectedVariant).toBeNull()
  })

  it('shows the saved variant in detail mode after a successful create', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    const created: ProductVariant = { ...riceVariant, id: 99, name: 'Arroz Integral 1kg' }
    act(() => result.current.handleVariantCreated(created))

    expect(result.current.variantMode).toBe('detail')
    expect(result.current.selectedVariant).toEqual(created)
  })

  it('shows the saved variant in detail mode after a successful update', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProductVariants(42, true), { wrapper })

    const updated: ProductVariant = { ...riceVariant, name: 'Arroz Premium 2kg' }
    act(() => result.current.handleVariantUpdated(updated))

    expect(result.current.variantMode).toBe('detail')
    expect(result.current.selectedVariant).toEqual(updated)
  })

  it('resets to the list on a fresh open (panel closed then reopened for the same product)', async () => {
    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(
      ({ isPanelOpen }: { isPanelOpen: boolean }) => useProductVariants(42, isPanelOpen),
      { wrapper, initialProps: { isPanelOpen: true } }
    )

    act(() => result.current.handleVariantClick(riceVariant))
    expect(result.current.variantMode).toBe('detail')

    // Close the panel (content stays mounted during the exit animation — see
    // use-products-list.ts's own closePanel — so nothing should reset here).
    rerender({ isPanelOpen: false })
    expect(result.current.variantMode).toBe('detail')

    // Reopen for the same product: must not silently reopen back into the nested screen.
    rerender({ isPanelOpen: true })
    expect(result.current.variantMode).toBe('list')
    expect(result.current.selectedVariant).toBeNull()
  })
})
