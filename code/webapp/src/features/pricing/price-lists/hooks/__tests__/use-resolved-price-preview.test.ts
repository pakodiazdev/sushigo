// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useResolvedPricePreview } from '../use-resolved-price-preview'

const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}))

vi.mock('../../api/pricing-api', () => ({
  pricingResolveApi: {
    resolve: vi.fn(),
  },
}))

import { pricingResolveApi } from '../../api/pricing-api'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useResolvedPricePreview', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('cannot preview until both a Variant and a Branch are chosen', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useResolvedPricePreview(), { wrapper })

    expect(result.current.canPreview).toBe(false)

    act(() => result.current.setItemVariantId('iv-1'))
    expect(result.current.canPreview).toBe(false)

    act(() => result.current.setBranchId(1))
    expect(result.current.canPreview).toBe(true)
  })

  it('calls the resolve endpoint with the selected context on preview', async () => {
    vi.mocked(pricingResolveApi.resolve).mockResolvedValue({
      data: {
        status: 200,
        data: {
          item_variant_id: 'iv-1',
          branch_id: 1,
          operating_unit_id: null,
          as_of: '2026-08-25',
          resolved: true,
          price: '129.5000',
          price_list: { id: 'pl-1', code: 'STANDARD', name: 'Standard Pricing' },
        },
      },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useResolvedPricePreview(), { wrapper })

    act(() => {
      result.current.setItemVariantId('iv-1')
      result.current.setBranchId(1)
    })

    act(() => result.current.handlePreview())

    await waitFor(() =>
      expect(pricingResolveApi.resolve).toHaveBeenCalledWith({
        item_variant_id: 'iv-1',
        branch_id: 1,
        operating_unit_id: null,
        as_of: undefined,
      })
    )
    await waitFor(() => expect(result.current.result?.resolved).toBe(true))
    expect(result.current.result?.price).toBe('129.5000')
  })

  it('surfaces an explicit resolved:false result without treating it as an error', async () => {
    vi.mocked(pricingResolveApi.resolve).mockResolvedValue({
      data: {
        status: 200,
        data: {
          item_variant_id: 'iv-1',
          branch_id: 1,
          operating_unit_id: null,
          as_of: '2026-08-25',
          resolved: false,
          price: null,
          price_list: null,
        },
      },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useResolvedPricePreview(), { wrapper })

    act(() => {
      result.current.setItemVariantId('iv-1')
      result.current.setBranchId(1)
    })
    act(() => result.current.handlePreview())

    await waitFor(() => expect(result.current.result?.resolved).toBe(false))
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it('clears the resolved result when any resolution criterion changes', async () => {
    vi.mocked(pricingResolveApi.resolve).mockResolvedValue({
      data: {
        status: 200,
        data: {
          item_variant_id: 'iv-1',
          branch_id: 1,
          operating_unit_id: null,
          as_of: '2026-08-25',
          resolved: true,
          price: '129.5000',
          price_list: { id: 'pl-1', code: 'STANDARD', name: 'Standard Pricing' },
        },
      },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useResolvedPricePreview(), { wrapper })

    act(() => {
      result.current.setItemVariantId('iv-1')
      result.current.setBranchId(1)
    })
    act(() => result.current.handlePreview())
    await waitFor(() => expect(result.current.result?.resolved).toBe(true))

    act(() => result.current.setAsOf('2026-08-26'))
    expect(result.current.result).toBeNull()
  })

  it('does not call resolve when preview is not allowed', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useResolvedPricePreview(), { wrapper })

    act(() => result.current.handlePreview())

    expect(pricingResolveApi.resolve).not.toHaveBeenCalled()
  })
})
