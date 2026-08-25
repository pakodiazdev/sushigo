/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'supplier-form-products') {
      return { data: { data: { data: [{ id: 'p1', name: 'Salmón' }] } } }
    }
    if (queryKey[0] === 'supplier-form-variants') {
      return {
        data: {
          data: {
            data: [
              { id: 'v1', name: 'Entero', code: 'SAL-1', is_active: true },
              { id: 'v2', name: 'Retirado', code: 'SAL-2', is_active: false },
            ],
          },
        },
      }
    }
    return {
      data: {
        data: {
          data: [
            { id: 'pp1', is_active: true, template: { name: 'Caja' } },
            { id: 'pp2', is_active: false, template: { name: 'Costal' } },
          ],
        },
      },
    }
  },
}))

describe('useSupplierOfferingForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('owns the product cascade and exposes only active variants and presentations', () => {
    const { result } = renderHook(() => useSupplierOfferingForm({
      supplierId: 's1',
      onSuccess: vi.fn(),
    }))

    act(() => result.current.onProductChange('p1'))
    expect(result.current.productId).toBe('p1')
    expect(result.current.variantId).toBe('')
    expect(result.current.variants.map((variant) => variant.id)).toEqual(['v1'])

    act(() => result.current.onVariantChange('v1'))
    expect(result.current.variantId).toBe('v1')
    expect(result.current.presentations.map((presentation) => presentation.id)).toEqual(['pp1'])

    act(() => result.current.onProductChange('p2'))
    expect(result.current.variantId).toBe('')
    expect(result.current.productId).toBe('p2')
  })

  it('normalizes commercial data before creating an offering', async () => {
    apiMocks.create.mockResolvedValue({})
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useSupplierOfferingForm({ supplierId: 's1', onSuccess }))

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
