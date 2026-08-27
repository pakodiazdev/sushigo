// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePriceListVariantPrices } from '../use-price-list-variant-prices'
import type { VariantPrice } from '../../types'
import type { ItemVariant } from '@/types/inventory'

const mockShowError = vi.fn()
const mockCanViewItems = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/use-can-access', () => ({
  useCanAccess: () => mockCanViewItems.value,
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  variantPriceApi: {
    list: vi.fn(),
  },
}))

vi.mock('@/services/inventory-api', () => ({
  itemVariantApi: {
    get: vi.fn(),
  },
}))

import { variantPriceApi } from '../../api/pricing-api'
import { itemVariantApi } from '@/services/inventory-api'

const vp1: VariantPrice = {
  id: 'vp-1',
  item_variant_id: 'iv-1',
  price_list_id: 'pl-1',
  price: '129.5000',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}
const vp2: VariantPrice = {
  id: 'vp-2',
  item_variant_id: 'iv-2',
  price_list_id: 'pl-1',
  price: '75.0000',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
}
const variant1: ItemVariant = {
  id: 'iv-1',
  item_id: 1,
  code: 'V1',
  name: 'Variant One',
  uom_id: 1,
  avg_unit_cost: 0,
  last_unit_cost: 0,
  is_active: true,
  item: { id: 1, sku: null, name: 'Product One', type: 'PRODUCTO', is_stocked: false, is_perishable: false, is_active: true },
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('usePriceListVariantPrices', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mockCanViewItems.value = true
  })

  it('loads variant prices and enriches with variant details, deduplicating lookups', async () => {
    vi.mocked(variantPriceApi.list).mockResolvedValue({
      data: { status: 200, data: [vp1, vp2], meta: { current_page: 1, total: 2, last_page: 1 } },
    } as never)
    vi.mocked(itemVariantApi.get).mockImplementation((id) =>
      Promise.resolve({ data: { status: 200, data: { ...variant1, id } } } as never)
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListVariantPrices('pl-1', true), { wrapper })

    await waitFor(() => expect(result.current.variantPrices).toHaveLength(2))
    await waitFor(() => expect(Object.keys(result.current.variantDetailsById)).toHaveLength(2))

    expect(itemVariantApi.get).toHaveBeenCalledTimes(2)
    expect(itemVariantApi.get).toHaveBeenCalledWith('iv-1')
    expect(itemVariantApi.get).toHaveBeenCalledWith('iv-2')
    expect(result.current.variantDetailsById['iv-1']!.name).toBe('Variant One')
  })

  it('loads every page of variant prices', async () => {
    vi.mocked(variantPriceApi.list)
      .mockResolvedValueOnce({
        data: { status: 200, data: [vp1], meta: { current_page: 1, total: 2, last_page: 2 } },
      } as never)
      .mockResolvedValueOnce({
        data: { status: 200, data: [vp2], meta: { current_page: 2, total: 2, last_page: 2 } },
      } as never)
    vi.mocked(itemVariantApi.get).mockImplementation((id) =>
      Promise.resolve({ data: { status: 200, data: { ...variant1, id } } } as never)
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListVariantPrices('pl-1', true), { wrapper })

    await waitFor(() => expect(result.current.variantPrices).toEqual([vp1, vp2]))
    expect(variantPriceApi.list).toHaveBeenNthCalledWith(1, 'pl-1', { per_page: 100, page: 1 })
    expect(variantPriceApi.list).toHaveBeenNthCalledWith(2, 'pl-1', { per_page: 100, page: 2 })
  })

  it('does not fetch item details without items.view permission', async () => {
    mockCanViewItems.value = false
    vi.mocked(variantPriceApi.list).mockResolvedValue({
      data: { status: 200, data: [vp1], meta: { current_page: 1, total: 1, last_page: 1 } },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListVariantPrices('pl-1', true), { wrapper })

    await waitFor(() => expect(result.current.variantPrices).toEqual([vp1]))
    expect(itemVariantApi.get).not.toHaveBeenCalled()
  })

  it('does not fetch while the panel is closed', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => usePriceListVariantPrices('pl-1', false), { wrapper })
    expect(variantPriceApi.list).not.toHaveBeenCalled()
  })

  it('drives create/edit navigation handlers', async () => {
    vi.mocked(variantPriceApi.list).mockResolvedValue({
      data: { status: 200, data: [vp1], meta: { current_page: 1, total: 1, last_page: 1 } },
    } as never)
    vi.mocked(itemVariantApi.get).mockResolvedValue({
      data: { status: 200, data: variant1 },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceListVariantPrices('pl-1', true), { wrapper })

    await waitFor(() => expect(result.current.variantPrices).toHaveLength(1))

    act(() => result.current.handleNewVariantPrice())
    expect(result.current.variantPriceMode).toBe('create')

    act(() => result.current.handleVariantPriceClick(vp1))
    expect(result.current.variantPriceMode).toBe('edit')
    expect(result.current.selectedVariantPrice).toEqual(vp1)

    act(() => result.current.handleBackToList())
    expect(result.current.variantPriceMode).toBe('list')
    expect(result.current.selectedVariantPrice).toBeNull()
  })
})
