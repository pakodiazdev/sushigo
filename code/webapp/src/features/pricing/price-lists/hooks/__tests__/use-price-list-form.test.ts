// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePriceListForm } from '../use-price-list-form'
import type { PriceList } from '../../types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  priceListApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

import { priceListApi } from '../../api/pricing-api'

const existingPriceList: PriceList = {
  id: 'pl-1',
  code: 'STANDARD',
  name: 'Standard Pricing',
  description: null,
  priority: 0,
  is_active: true,
}

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

describe('usePriceListForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    it('calls priceListApi.create with the form values on submit', async () => {
      vi.mocked(priceListApi.create).mockResolvedValue({
        data: { status: 201, data: { ...existingPriceList, id: 'pl-2' } },
      } as never)
      const onSuccess = vi.fn()
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => usePriceListForm({ onSuccess }), { wrapper })

      act(() => {
        result.current.setValue('code', 'PROMO')
        result.current.setValue('name', 'Promo Pricing')
        result.current.setValue('priority', 5)
      })

      await act(async () => {
        await result.current.handleSubmit(result.current.onSubmit)({
          preventDefault: () => {},
        } as unknown as React.BaseSyntheticEvent)
      })

      await waitFor(() =>
        expect(priceListApi.create).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'PROMO', name: 'Promo Pricing', priority: 5 })
        )
      )
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 'pl-2' }))
    })

    it('is not in editing mode', () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => usePriceListForm({ onSuccess: vi.fn() }), { wrapper })
      expect(result.current.isEditing).toBe(false)
    })
  })

  describe('edit mode', () => {
    it('prefills from the given price list and is in editing mode', () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(
        () => usePriceListForm({ priceList: existingPriceList, onSuccess: vi.fn() }),
        { wrapper }
      )
      expect(result.current.isEditing).toBe(true)
      expect(result.current.isActive).toBe(true)
    })

    it('calls priceListApi.update on submit', async () => {
      vi.mocked(priceListApi.update).mockResolvedValue({
        data: { status: 200, data: existingPriceList },
      } as never)
      const onSuccess = vi.fn()
      const { wrapper } = makeWrapper()
      const { result } = renderHook(
        () => usePriceListForm({ priceList: existingPriceList, onSuccess }),
        { wrapper }
      )

      await act(async () => {
        await result.current.handleSubmit(result.current.onSubmit)({
          preventDefault: () => {},
        } as unknown as React.BaseSyntheticEvent)
      })

      await waitFor(() => expect(priceListApi.update).toHaveBeenCalledWith('pl-1', expect.any(Object)))
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
