// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReceiptLineFields } from '../use-receipt-line-fields'
import type { Product, ProductVariant } from '@/types/inventory'

vi.mock('@/services/inventory-api', () => ({
  productApi: { list: vi.fn() },
  productVariantApi: { list: vi.fn() },
  variantPurchasePresentationApi: { list: vi.fn() },
}))
vi.mock('@/features/purchasing/suppliers/api/supplier-api', () => ({
  supplierOfferingApi: { list: vi.fn() },
}))

import { productApi, productVariantApi } from '@/services/inventory-api'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

function product(id: string): Product {
  return { id, name: `Product ${id}` } as Product
}

function variant(id: string): ProductVariant {
  return { id, name: `Variant ${id}`, code: id, is_active: true } as ProductVariant
}

describe('useReceiptLineFields — product pagination', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches every page of the product catalog, not just the first 100', async () => {
    const pageOneProducts = Array.from({ length: 100 }, (_, index) => product(`p${index + 1}`))
    const pageTwoProducts = [product('p101')]

    vi.mocked(productApi.list).mockImplementation((params) => {
      const page = params?.page ?? 1
      if (page === 1) {
        return Promise.resolve({
          data: { status: 200, data: pageOneProducts, meta: { current_page: 1, total: 101, last_page: 2 } },
        } as never)
      }
      return Promise.resolve({
        data: { status: 200, data: pageTwoProducts, meta: { current_page: 2, total: 101, last_page: 2 } },
      } as never)
    })

    const { result } = renderHook(
      () => useReceiptLineFields({ index: 0, supplierId: '', setValue: vi.fn() }),
      makeWrapper(),
    )

    await waitFor(() => expect(result.current.products).toHaveLength(101))
    expect(result.current.products.some((candidate) => candidate.id === 'p101')).toBe(true)
    expect(productApi.list).toHaveBeenCalledWith({ is_active: true, page: 1, per_page: 100 })
    expect(productApi.list).toHaveBeenCalledWith({ is_active: true, page: 2, per_page: 100 })
  })

  it('does not request a second page when everything fits on the first', async () => {
    vi.mocked(productApi.list).mockResolvedValue({
      data: { status: 200, data: [product('p1')], meta: { current_page: 1, total: 1, last_page: 1 } },
    } as never)

    const { result } = renderHook(
      () => useReceiptLineFields({ index: 0, supplierId: '', setValue: vi.fn() }),
      makeWrapper(),
    )

    await waitFor(() => expect(result.current.products).toHaveLength(1))
    expect(productApi.list).toHaveBeenCalledTimes(1)
  })
})

describe('useReceiptLineFields — variant pagination', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches every page of a product’s variant list, not just the first 100', async () => {
    vi.mocked(productApi.list).mockResolvedValue({
      data: { status: 200, data: [product('p1')], meta: { current_page: 1, total: 1, last_page: 1 } },
    } as never)

    const pageOneVariants = Array.from({ length: 100 }, (_, index) => variant(`v${index + 1}`))
    const pageTwoVariants = [variant('v101')]
    vi.mocked(productVariantApi.list).mockImplementation((_productId, params) => {
      const page = params?.page ?? 1
      if (page === 1) {
        return Promise.resolve({
          data: { status: 200, data: pageOneVariants, meta: { current_page: 1, total: 101, last_page: 2 } },
        } as never)
      }
      return Promise.resolve({
        data: { status: 200, data: pageTwoVariants, meta: { current_page: 2, total: 101, last_page: 2 } },
      } as never)
    })

    const { result } = renderHook(
      () => useReceiptLineFields({ index: 0, supplierId: '', setValue: vi.fn() }),
      makeWrapper(),
    )

    act(() => result.current.onProductChange('p1'))

    await waitFor(() => expect(result.current.variants).toHaveLength(101))
    expect(result.current.variants.some((candidate) => candidate.id === 'v101')).toBe(true)
    expect(productVariantApi.list).toHaveBeenCalledWith('p1', { page: 1, per_page: 100 })
    expect(productVariantApi.list).toHaveBeenCalledWith('p1', { page: 2, per_page: 100 })
  })
})
