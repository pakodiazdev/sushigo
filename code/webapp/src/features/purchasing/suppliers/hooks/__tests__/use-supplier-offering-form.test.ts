/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSupplierOfferingForm } from '../use-supplier-offering-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../../api/supplier-api', () => ({ supplierOfferingApi: apiMocks }))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: { mutationFn: (values: unknown) => Promise<unknown>; onSuccess: () => void }) => ({
    execute: async (values: unknown) => {
      await config.mutationFn(values)
      config.onSuccess()
    },
    validationErrors: {},
    isPending: false,
  }),
}))

vi.mock('@/services/inventory-api', () => ({
  productApi: { list: vi.fn() },
  productVariantApi: { list: vi.fn() },
  variantPurchasePresentationApi: { list: vi.fn() },
}))

import { productApi, productVariantApi, variantPurchasePresentationApi } from '@/services/inventory-api'

const asResponse = <T,>(rows: T[]) => ({ data: { data: rows } }) as never

// Server-side search: the products/variants queries pass their debounced search term straight to
// the API, so the mock keys its rows on that term — this is how the tests prove a record outside
// the first page can still be reached (#506).
const page1Products = [{ id: 'p1', name: 'Salmón' }]
const searchedProducts: Record<string, Array<{ id: string; name: string }>> = {
  atun: [{ id: 'p999', name: 'Atún aleta amarilla' }],
}
const page1Variants = [
  { id: 'v1', name: 'Entero', code: 'SAL-1', is_active: true },
  { id: 'v2', name: 'Retirado', code: 'SAL-2', is_active: false },
]
const searchedVariants: Record<string, Array<{ id: string; name: string; code: string; is_active: boolean }>> = {
  needle: [{ id: 'v999', name: 'Variante escondida', code: 'HID-999', is_active: true }],
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

function renderForm(options?: Partial<Parameters<typeof useSupplierOfferingForm>[0]>) {
  const { wrapper } = makeWrapper()
  return renderHook(
    () => useSupplierOfferingForm({ supplierId: 's1', onSuccess: vi.fn(), ...options }),
    { wrapper }
  )
}

beforeEach(() => {
  vi.mocked(productApi.list).mockImplementation((params) =>
    Promise.resolve(asResponse(searchedProducts[String(params?.search ?? '')] ?? page1Products))
  )
  vi.mocked(productVariantApi.list).mockImplementation((_productId, params) =>
    Promise.resolve(asResponse(searchedVariants[String(params?.search ?? '')] ?? page1Variants))
  )
  vi.mocked(variantPurchasePresentationApi.list).mockResolvedValue(
    asResponse([
      { id: 'pp1', is_active: true, template: { name: 'Caja' } },
      { id: 'pp2', is_active: false, template: { name: 'Costal' } },
    ])
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useSupplierOfferingForm', () => {
  it('queries products and variants with a small page size and the debounced search term', async () => {
    const { result } = renderForm()

    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p1']))
    expect(productApi.list).toHaveBeenCalledWith({ is_active: true, search: undefined, per_page: 20 })

    act(() => result.current.onProductChange('p1'))
    await waitFor(() => expect(productVariantApi.list).toHaveBeenCalledWith('p1', { search: undefined, is_active: true, per_page: 20 }))
  })

  it('owns the product cascade and exposes only active variants and presentations', async () => {
    const { result } = renderForm()

    act(() => result.current.onProductChange('p1'))
    await waitFor(() => expect(result.current.variants.map((variant) => variant.id)).toEqual(['v1']))
    expect(result.current.variantId).toBe('')

    act(() => result.current.onVariantChange('v1'))
    await waitFor(() => expect(result.current.presentations.map((p) => p.id)).toEqual(['pp1']))
    expect(result.current.variantId).toBe('v1')

    act(() => result.current.onProductChange(''))
    expect(result.current.variantId).toBe('')
    expect(result.current.productId).toBe('')
  })

  it('lets a product outside the first page be found and selected through the search box', async () => {
    const { result } = renderForm()
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p1']))

    act(() => result.current.setProductSearch('atun'))
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p999']))

    act(() => result.current.onProductChange('p999'))
    expect(result.current.productId).toBe('p999')
  })

  it('lets a variant outside the first page be found and selected through the search box', async () => {
    const { result } = renderForm()
    act(() => result.current.onProductChange('p1'))
    await waitFor(() => expect(result.current.variants.map((v) => v.id)).toEqual(['v1']))

    act(() => result.current.setVariantSearch('needle'))
    await waitFor(() => {
      expect(productVariantApi.list).toHaveBeenLastCalledWith('p1', { search: 'needle', is_active: true, per_page: 20 })
      expect(result.current.variants.map((v) => v.id)).toEqual(['v999'])
    })

    act(() => result.current.onVariantChange('v999'))
    expect(result.current.variantId).toBe('v999')
  })

  it('resets the variant search when the product changes so the new list is not stale-filtered', async () => {
    const { result } = renderForm()
    act(() => result.current.onProductChange('p1'))
    await waitFor(() => expect(result.current.variants.map((v) => v.id)).toEqual(['v1']))

    act(() => result.current.setVariantSearch('needle'))
    await waitFor(() => expect(result.current.variants.map((v) => v.id)).toEqual(['v999']))

    act(() => result.current.onProductChange('p2'))
    expect(result.current.variantSearch).toBe('')
    await waitFor(() =>
      expect(productVariantApi.list).toHaveBeenLastCalledWith('p2', { search: undefined, is_active: true, per_page: 20 })
    )
  })

  it('clears a selected product that a later search no longer returns', async () => {
    const { result } = renderForm()

    act(() => result.current.setProductSearch('atun'))
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p999']))
    act(() => result.current.onProductChange('p999'))
    expect(result.current.productId).toBe('p999')

    act(() => result.current.setProductSearch(''))
    await waitFor(() => expect(result.current.productId).toBe(''))
  })

  it('clears a selected variant that a later search no longer returns', async () => {
    const { result } = renderForm()
    act(() => result.current.onProductChange('p1'))
    await waitFor(() => expect(result.current.variants.map((v) => v.id)).toEqual(['v1']))
    act(() => result.current.onVariantChange('v1'))
    expect(result.current.variantId).toBe('v1')

    act(() => result.current.setVariantSearch('needle'))
    await waitFor(() => expect(result.current.variantId).toBe(''))
  })

  it('keeps the selected product when a later search request fails', async () => {
    const { result } = renderForm()
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p1']))
    act(() => result.current.onProductChange('p1'))

    vi.mocked(productApi.list).mockRejectedValueOnce(new Error('network down'))
    act(() => result.current.setProductSearch('boom'))

    await waitFor(() => expect(result.current.hasProductSearchError).toBe(true))
    expect(result.current.productId).toBe('p1')
  })

  it('normalizes commercial data before creating an offering', async () => {
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const { result } = renderForm({ onSuccess })

    await act(async () => {
      await result.current.onSubmit({
        product_id: 'p1',
        variant_id: 'v1',
        variant_purchase_presentation_id: 'pp1',
        supplier_code: '',
        quoted_price: 480.25,
        currency: 'mxn',
        valid_from: '',
        valid_until: '',
        minimum_order_quantity: 2,
        lead_time_days: Number.NaN,
        is_active: true,
      })
    })

    expect(apiMocks.create).toHaveBeenCalledWith('s1', {
      variant_purchase_presentation_id: 'pp1',
      supplier_code: null,
      quoted_price: 480.25,
      currency: 'MXN',
      valid_from: null,
      valid_until: null,
      minimum_order_quantity: 2,
      lead_time_days: null,
      is_active: true,
    })
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
