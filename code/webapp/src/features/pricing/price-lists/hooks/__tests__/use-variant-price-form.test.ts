// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVariantPriceForm } from '../use-variant-price-form'
import type { VariantPrice } from '../../types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  variantPriceApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

import { variantPriceApi } from '../../api/pricing-api'

const existingVariantPrice: VariantPrice = {
  id: 'vp-1',
  item_variant_id: 'iv-1',
  price_list_id: 'pl-1',
  price: '129.5000',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
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

function submit(handleSubmit: unknown, onSubmit: unknown) {
  return act(async () => {
    await (handleSubmit as (fn: unknown) => (e?: unknown) => void)(onSubmit)({ preventDefault: () => {} })
  })
}

describe('useVariantPriceForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a price with more than 4 decimal places before hitting the API', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantPriceForm({ priceListId: 'pl-1', onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('item_variant_id', 'iv-1')
      result.current.setValue('price', '129.50001')
      result.current.setValue('effective_from', '2026-01-01')
    })

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() => expect(result.current.allErrors.price).toBeTruthy())
    expect(variantPriceApi.create).not.toHaveBeenCalled()
  })

  it('sends the exact decimal price string on create, unchanged', async () => {
    vi.mocked(variantPriceApi.create).mockResolvedValue({
      data: { status: 201, data: { ...existingVariantPrice, id: 'vp-2' } },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantPriceForm({ priceListId: 'pl-1', onSuccess }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('item_variant_id', 'iv-1')
      result.current.setValue('price', '99.9900')
      result.current.setValue('effective_from', '2026-01-01')
    })

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() =>
      expect(variantPriceApi.create).toHaveBeenCalledWith(
        'pl-1',
        expect.objectContaining({ item_variant_id: 'iv-1', price: '99.9900' })
      )
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it('omits item_variant_id from the update payload', async () => {
    vi.mocked(variantPriceApi.update).mockResolvedValue({
      data: { status: 200, data: existingVariantPrice },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useVariantPriceForm({ priceListId: 'pl-1', variantPrice: existingVariantPrice, onSuccess: vi.fn() }),
      { wrapper }
    )

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() => expect(variantPriceApi.update).toHaveBeenCalled())
    const payload = vi.mocked(variantPriceApi.update).mock.calls[0]![2]
    expect(payload).not.toHaveProperty('item_variant_id')
  })

  it('surfaces an overlap conflict on effective_from', async () => {
    const conflictResponse = {
      status: 422,
      data: { errors: { effective_from: ['Ya existe un precio activo...'] } },
    }
    vi.mocked(variantPriceApi.create).mockRejectedValue(
      new AxiosError('Validation failed', '422', undefined, undefined, conflictResponse as never)
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantPriceForm({ priceListId: 'pl-1', onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('item_variant_id', 'iv-1')
      result.current.setValue('price', '10.0000')
      result.current.setValue('effective_from', '2026-01-01')
    })

    await submit(result.current.handleSubmit, result.current.onSubmit)

    await waitFor(() => expect(result.current.allErrors.effective_from).toContain('Ya existe un precio activo'))
  })
})
