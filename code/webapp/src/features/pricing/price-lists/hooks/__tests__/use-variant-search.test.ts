// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVariantSearch } from '../use-variant-search'
import type { ItemVariant } from '@/types/inventory'

vi.mock('@/services/inventory-api', () => ({
  itemVariantApi: {
    list: vi.fn(),
  },
}))

import { itemVariantApi } from '@/services/inventory-api'

const variant: ItemVariant = {
  id: 'iv-1',
  item_id: 1,
  code: 'V1',
  name: 'Variant One',
  uom_id: 1,
  is_active: true,
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useVariantSearch', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('scopes the search to PRODUCTO-type items only', async () => {
    vi.mocked(itemVariantApi.list).mockResolvedValue({
      data: { status: 200, data: [variant], meta: { current_page: 1, total: 1 } },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantSearch(), { wrapper })

    await waitFor(() => expect(result.current.variants).toHaveLength(1))
    expect(itemVariantApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ item_type: 'PRODUCTO', is_active: true, per_page: 20 })
    )
  })

  it('re-queries when the search term changes', async () => {
    vi.mocked(itemVariantApi.list).mockResolvedValue({
      data: { status: 200, data: [variant], meta: { current_page: 1, total: 1 } },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantSearch(), { wrapper })

    await waitFor(() => expect(itemVariantApi.list).toHaveBeenCalledTimes(1))

    act(() => result.current.setSearch('roll'))

    await waitFor(() =>
      expect(itemVariantApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'roll' }))
    )
  })
})
