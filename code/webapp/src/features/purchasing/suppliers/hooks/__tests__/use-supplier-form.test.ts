/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSupplierForm } from '../use-supplier-form'

const apiMocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), nextCode: vi.fn() }))
const clearValidationErrors = vi.hoisted(() => vi.fn())

vi.mock('../../api/supplier-api', () => ({ supplierApi: apiMocks }))

vi.mock('@/lib/api-error', () => ({
  isApiError: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'response' in error),
}))

vi.mock('@/hooks/use-form-mutation', () => ({
  useFormMutation: (config: {
    mutationFn: (values: unknown) => Promise<unknown>
    onSuccess: () => void
  }) => ({
    mutation: {
      mutateAsync: async (values: unknown) => {
        const result = await config.mutationFn(values)
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

describe('useSupplierForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('normalizes supplier data before creating it', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-001', prefix: 'PROV-' } })
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useSupplierForm({ onSuccess }), { wrapper })

    await act(async () => {
      await result.current.onSubmit({
        code: 'mar-01',
        name: 'Mar Uno',
        contact_name: '',
        email: '',
        phone: '',
        is_active: true,
      })
    })

    expect(apiMocks.create).toHaveBeenCalledWith({
      code: 'MAR-01',
      name: 'Mar Uno',
      contact_name: null,
      email: null,
      phone: null,
      is_active: true,
    })
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('updates the selected supplier in edit mode without fetching a suggestion', async () => {
    apiMocks.update.mockResolvedValue({})
    const supplier = {
      id: 's1',
      code: 'MAR',
      name: 'Mar',
      contact_name: null,
      email: null,
      phone: null,
      is_active: true,
      offerings_count: 0,
    }
    const { result } = renderHook(() => useSupplierForm({ supplier, onSuccess: vi.fn() }), { wrapper })

    expect(result.current.isEditing).toBe(true)

    await act(async () => {
      await result.current.onSubmit({
        code: 'mar',
        name: 'Mar Actualizado',
        contact_name: '',
        email: '',
        phone: '',
        is_active: false,
      })
    })

    expect(apiMocks.update).toHaveBeenCalledWith('s1', expect.objectContaining({
      code: 'MAR',
      name: 'Mar Actualizado',
      is_active: false,
    }))
    expect(apiMocks.nextCode).not.toHaveBeenCalled()
  })

  it('surfaces a regenerated suggestion when the create request loses a code race', async () => {
    apiMocks.nextCode.mockResolvedValue({ data: { code: 'PROV-014', prefix: 'PROV-' } })
    apiMocks.create.mockRejectedValue({
      response: { data: { rejected_code: 'PROV-014', suggested_code: 'PROV-015' } },
    })
    const { result } = renderHook(() => useSupplierForm({ onSuccess: vi.fn() }), { wrapper })

    await act(async () => {
      await result.current.onSubmit({
        code: 'prov-014',
        name: 'Perdedor',
        contact_name: '',
        email: '',
        phone: '',
        is_active: true,
      })
    })

    await waitFor(() =>
      expect(result.current.collision).toEqual({
        rejectedCode: 'PROV-014',
        suggestedCode: 'PROV-015',
      }),
    )
    // The untouched suggestion was replaced in place, so the stale duplicate-code
    // error from the failed submit is cleared (once on entry, once after replacing).
    expect(clearValidationErrors).toHaveBeenCalledTimes(2)
  })
})
