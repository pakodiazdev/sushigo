/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useItemForm } from '../use-item-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), nextSku: vi.fn() }))
const clearValidationErrors = vi.hoisted(() => vi.fn())

vi.mock('@/services/inventory-api', () => ({ itemApi: apiMocks }))

vi.mock('@/lib/api-error', () => ({
  isApiError: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'response' in error),
}))

vi.mock('@/hooks/use-form-mutation', () => ({
  useCreateUpdateMutation: (config: {
    createFn: (values: unknown) => Promise<unknown>
    updateFn: (values: unknown) => Promise<unknown>
    isEditing: boolean
    onSuccess: () => void
  }) => ({
    mutation: {
      mutateAsync: async (values: unknown) => {
        const result = config.isEditing
          ? await config.updateFn(values)
          : await config.createFn(values)
        config.onSuccess()
        return result
      },
      error: null,
    },
    validationErrors: {},
    clearValidationErrors,
    isPending: false,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

const baseValues = {
  sku: '',
  name: '',
  description: '',
  type: 'INSUMO' as const,
  is_stocked: true,
  is_perishable: false,
  is_active: true,
}

describe('useItemForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('prefills the SKU with the server suggestion derived from the debounced name', async () => {
    apiMocks.nextSku.mockResolvedValue({ data: { sku: 'SAL-001', prefix: 'SAL-' } })
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    act(() => {
      result.current.setValue('name', 'Salmón fresco')
    })

    await waitFor(() => {
      expect(apiMocks.nextSku).toHaveBeenCalledWith({ name: 'Salmón fresco' })
    })
    await waitFor(() => {
      expect(result.current.skuValue).toBe('SAL-001')
    })
    expect(result.current.isSkuSuggested).toBe(true)
  })

  it('stops overwriting the SKU once the operator edits it manually', async () => {
    apiMocks.nextSku.mockResolvedValue({ data: { sku: 'SAL-001', prefix: 'SAL-' } })
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    act(() => {
      result.current.skuField.onChange({
        target: { value: 'my-own-sku', name: 'sku' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.isSkuSuggested).toBe(false)
    expect(result.current.skuValue).toBe('MY-OWN-SKU')

    act(() => {
      result.current.setValue('name', 'Salmón fresco')
    })
    await waitFor(() => expect(apiMocks.nextSku).toHaveBeenCalled())
    // Give the prefill effect a chance to (not) run.
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.skuValue).toBe('MY-OWN-SKU')
  })

  it('does not fetch a suggestion in edit mode', async () => {
    apiMocks.update.mockResolvedValue({})
    const item = {
      id: 7,
      sku: 'REF-004',
      name: 'Refrigerador',
      description: '',
      type: 'ACTIVO' as const,
      is_stocked: true,
      is_perishable: false,
      is_active: true,
      created_at: '',
      updated_at: '',
    }
    const { result } = renderHook(() => useItemForm({ item, onSuccess: vi.fn() }), { wrapper })

    expect(result.current.isEditing).toBe(true)

    await act(async () => {
      await result.current.onSubmit({ ...baseValues, sku: 'ref-004', name: 'Refrigerador nuevo', type: 'ACTIVO' })
    })

    expect(apiMocks.update).toHaveBeenCalledWith(7, expect.objectContaining({ sku: 'REF-004' }))
    expect(apiMocks.nextSku).not.toHaveBeenCalled()
  })

  it('uppercases the SKU before creating the item', async () => {
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useItemForm({ onSuccess }), { wrapper })

    await act(async () => {
      await result.current.onSubmit({ ...baseValues, sku: 'sal-001', name: 'Salmón fresco' })
    })

    expect(apiMocks.create).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SAL-001', name: 'Salmón fresco' }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('surfaces a regenerated suggestion and replaces an untouched SKU on a create-time race', async () => {
    apiMocks.nextSku.mockResolvedValue({ data: { sku: 'SAL-001', prefix: 'SAL-' } })
    apiMocks.create.mockRejectedValue({
      response: { data: { rejected_sku: 'SAL-002', suggested_sku: 'SAL-003' } },
    })
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    await act(async () => {
      await result.current.onSubmit({ ...baseValues, sku: 'SAL-002', name: 'Salmón fresco' })
    })

    await waitFor(() =>
      expect(result.current.collision).toEqual({ rejectedSku: 'SAL-002', suggestedSku: 'SAL-003' }),
    )
    expect(result.current.skuValue).toBe('SAL-003')
    expect(result.current.canApplySuggestedSku).toBe(false)
  })

  it('preserves a manually chosen SKU on a race and offers the alternative explicitly', async () => {
    apiMocks.create.mockRejectedValue({
      response: { data: { rejected_sku: 'MINE-9', suggested_sku: 'SAL-003' } },
    })
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    act(() => {
      result.current.skuField.onChange({
        target: { value: 'mine-9', name: 'sku' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    await act(async () => {
      await result.current.onSubmit({ ...baseValues, sku: 'MINE-9', name: 'Salmón fresco' })
    })

    await waitFor(() => expect(result.current.collision).not.toBeNull())
    expect(result.current.skuValue).toBe('MINE-9')
    expect(result.current.canApplySuggestedSku).toBe(true)

    act(() => result.current.applySuggestedSku())
    expect(result.current.skuValue).toBe('SAL-003')
    expect(result.current.collision).toBeNull()
  })

  it('clears a stale generated SKU when the name changes and the new suggestion request fails', async () => {
    apiMocks.nextSku
      .mockResolvedValueOnce({ data: { sku: 'SAL-001', prefix: 'SAL-' } })
      .mockRejectedValueOnce(new Error('network down'))
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    act(() => result.current.setValue('name', 'Salmón'))
    await waitFor(() => expect(result.current.skuValue).toBe('SAL-001'))

    act(() => result.current.setValue('name', 'Refrigerador'))

    await waitFor(() => expect(apiMocks.nextSku).toHaveBeenCalledTimes(2))
    // The stale SAL-001 (generated for "Salmón") is gone — not left submittable.
    await waitFor(() => expect(result.current.skuValue).toBe(''))
    await waitFor(() => expect(result.current.suggestionFailed).toBe(true))
  })

  it('drops a collision pin and alert once the name context changes', async () => {
    apiMocks.nextSku
      .mockResolvedValueOnce({ data: { sku: 'SAL-001', prefix: 'SAL-' } })
      .mockResolvedValueOnce({ data: { sku: 'REF-001', prefix: 'REF-' } })
    apiMocks.create.mockRejectedValueOnce({
      response: { data: { rejected_sku: 'SAL-001', suggested_sku: 'SAL-002' } },
    })
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    act(() => result.current.setValue('name', 'Salmón'))
    await waitFor(() => expect(result.current.skuValue).toBe('SAL-001'))

    await act(async () => {
      await result.current.onSubmit({ ...baseValues, sku: 'SAL-001', name: 'Salmón' })
    })
    await waitFor(() => expect(result.current.collision).not.toBeNull())
    expect(result.current.skuValue).toBe('SAL-002')

    act(() => result.current.setValue('name', 'Refrigerador'))

    await waitFor(() => expect(result.current.collision).toBeNull())
    await waitFor(() => expect(result.current.skuValue).toBe('REF-001'))
  })

  it('regenerate clears manual-edit state and refetches', async () => {
    apiMocks.nextSku
      .mockResolvedValueOnce({ data: { sku: 'SAL-001', prefix: 'SAL-' } })
      .mockResolvedValueOnce({ data: { sku: 'SAL-002', prefix: 'SAL-' } })
    const { result } = renderHook(() => useItemForm({ onSuccess: vi.fn() }), { wrapper })

    act(() => result.current.setValue('name', 'Salmón'))
    await waitFor(() => expect(result.current.skuValue).toBe('SAL-001'))

    act(() => {
      result.current.skuField.onChange({
        target: { value: 'SAL-001-EDITED', name: 'sku' },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.isSkuSuggested).toBe(false)

    act(() => result.current.handleRegenerateSku())
    expect(result.current.isSkuSuggested).toBe(true)
    await waitFor(() => expect(result.current.skuValue).toBe('SAL-002'))
  })
})
