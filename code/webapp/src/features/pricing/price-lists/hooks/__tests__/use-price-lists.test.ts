// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePriceLists } from '../use-price-lists'
import type { PriceList } from '../../types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  priceListApi: {
    list: vi.fn(),
    delete: vi.fn(),
  },
}))

import { priceListApi } from '../../api/pricing-api'

const standard: PriceList = {
  id: 'pl-1',
  code: 'STANDARD',
  name: 'Standard Pricing',
  description: null,
  priority: 0,
  is_active: true,
}
const promo: PriceList = {
  id: 'pl-2',
  code: 'PROMO',
  name: 'Promo Pricing',
  description: null,
  priority: 10,
  is_active: false,
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

describe('usePriceLists', () => {
  beforeEach(() => {
    vi.mocked(priceListApi.list).mockResolvedValue({
      data: { status: 200, data: [standard, promo], meta: { current_page: 1, total: 2, last_page: 1 } },
    } as never)
    vi.mocked(priceListApi.delete).mockResolvedValue({ data: { status: 200 } } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads price lists', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceLists(), { wrapper })

    await waitFor(() => expect(result.current.priceLists).toHaveLength(2))
    expect(result.current.priceLists.map((p) => p.code)).toEqual(['STANDARD', 'PROMO'])
  })

  it('filters client-side by search query on name or code', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceLists(), { wrapper })

    await waitFor(() => expect(result.current.priceLists).toHaveLength(2))

    act(() => result.current.setSearchQuery('promo'))

    await waitFor(() => expect(result.current.priceLists).toHaveLength(1))
    expect(result.current.priceLists[0]!.code).toBe('PROMO')
  })

  it('fetches every page and finds a match past the first page', async () => {
    const manyStandard: PriceList[] = Array.from({ length: 100 }, (_, index) => ({
      id: `pl-standard-${index}`,
      code: `STD-${index}`,
      name: `Standard ${index}`,
      description: null,
      priority: 0,
      is_active: true,
    }))
    vi.mocked(priceListApi.list).mockImplementation((params) => {
      const page = params?.page ?? 1
      if (page === 1) {
        return Promise.resolve({
          data: { status: 200, data: manyStandard, meta: { current_page: 1, total: 101, last_page: 2 } },
        } as never)
      }
      return Promise.resolve({
        data: { status: 200, data: [promo], meta: { current_page: 2, total: 101, last_page: 2 } },
      } as never)
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceLists(), { wrapper })

    await waitFor(() => expect(priceListApi.list).toHaveBeenCalledTimes(2))

    act(() => result.current.setSearchQuery('promo'))

    await waitFor(() => expect(result.current.priceLists).toHaveLength(1))
    expect(result.current.priceLists[0]!.code).toBe('PROMO')
  })

  it('opens the panel in create mode via handleNewPriceList', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceLists(), { wrapper })

    act(() => result.current.handleNewPriceList())

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('create')
    expect(result.current.selectedPriceList).toBeNull()
  })

  it('opens the panel in detail mode via handleRowClick', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceLists(), { wrapper })

    act(() => result.current.handleRowClick(standard))

    expect(result.current.isPanelOpen).toBe(true)
    expect(result.current.panelMode).toBe('detail')
    expect(result.current.selectedPriceList).toEqual(standard)
  })

  it('deletes the selected price list and closes the panel', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePriceLists(), { wrapper })

    act(() => result.current.handleRowClick(standard))
    vi.stubGlobal('confirm', () => true)

    act(() => result.current.handleDelete())

    await waitFor(() => expect(priceListApi.delete).toHaveBeenCalledWith('pl-1'))
    await waitFor(() => expect(result.current.isPanelOpen).toBe(false))
    expect(mockShowSuccess).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
