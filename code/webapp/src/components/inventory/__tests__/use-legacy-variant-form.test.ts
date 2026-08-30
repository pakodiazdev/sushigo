// @vitest-environment jsdom
import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLegacyVariantForm } from '../use-legacy-variant-form'
import { itemVariantApi } from '@/services/inventory-api'

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useItemsSelect: () => ({ data: [{ id: 'item-01', name: 'Harina', sku: 'HAR-001' }] }),
  useUnitsOfMeasureSelect: () => ({ data: [{ id: 'uom-02', name: 'Kilogramo', symbol: 'kg' }] }),
}))

vi.mock('@/services/inventory-api', () => ({
  itemVariantApi: {
    suggestCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

describe('useLegacyVariantForm', () => {
  beforeEach(() => {
    vi.mocked(itemVariantApi.suggestCode).mockResolvedValue({ data: { code: 'HAR-KG', prefix: 'HAR-' } } as never)
  })

  afterEach(() => vi.clearAllMocks())

  it('prefills the same contextual suggestion contract and preserves a manual override', async () => {
    const { result } = renderHook(
      () => useLegacyVariantForm({ variant: null, onSuccess: vi.fn() }),
      { wrapper: wrapper() },
    )

    act(() => {
      result.current.setValue('item_id', 'item-01')
      result.current.setValue('name', '1 kg')
      result.current.setValue('uom_id', 'uom-02')
    })
    await waitFor(() => expect(result.current.currentCode).toBe('HAR-KG'), { timeout: 1500 })
    expect(itemVariantApi.suggestCode).toHaveBeenCalledWith({
      item_id: 'item-01',
      name: '1 kg',
      uom_id: 'uom-02',
    })

    act(() => {
      result.current.setValue('code', 'manual')
      result.current.onCodeChange({ target: { name: 'code', value: 'manual' }, type: 'change' } as never)
      result.current.setValue('name', '500 g')
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(result.current.currentCode).toBe('MANUAL')
    expect(itemVariantApi.suggestCode).toHaveBeenCalledTimes(1)
  })

  it('offers a collision replacement without overwriting a manual code', async () => {
    vi.mocked(itemVariantApi.create).mockRejectedValue(new AxiosError('422', '422', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as never,
      data: { rejected_code: 'MANUAL', suggested_code: 'HAR-KG-002', errors: { code: ['ocupado'] } },
    } as never))
    const { result } = renderHook(
      () => useLegacyVariantForm({ variant: null, onSuccess: vi.fn() }),
      { wrapper: wrapper() },
    )
    act(() => {
      result.current.setValue('code', 'MANUAL')
      result.current.onCodeChange({ target: { name: 'code', value: 'MANUAL' }, type: 'change' } as never)
    })

    await act(async () => result.current.onSubmit({ item_id: 'item-01', name: '1 kg', code: 'MANUAL', uom_id: 'uom-02', is_active: true }))

    await waitFor(() => expect(result.current.collision?.suggestedCode).toBe('HAR-KG-002'))
    expect(result.current.currentCode).toBe('MANUAL')
    expect(result.current.allErrors.code).toBeUndefined()
    act(() => result.current.applySuggestedCode())
    expect(result.current.currentCode).toBe('HAR-KG-002')
  })
})
