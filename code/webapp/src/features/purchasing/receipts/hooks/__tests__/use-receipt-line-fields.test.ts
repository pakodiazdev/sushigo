/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReceiptLineFields } from '../use-receipt-line-fields'

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'receipt-form-products') {
      return { data: { data: { data: [{ id: 'p1', name: 'Arroz' }] } } }
    }
    if (queryKey[0] === 'receipt-form-variants') {
      return {
        data: {
          data: {
            data: [
              { id: 'v1', name: 'Arroz 20kg', code: 'RICE-20', is_active: true },
              { id: 'v2', name: 'Descontinuado', code: 'RICE-OLD', is_active: false },
            ],
          },
        },
      }
    }
    if (queryKey[0] === 'receipt-form-presentations') {
      return {
        data: {
          data: {
            data: [
              { id: 'pp1', is_active: true, template: { name: 'Caja x24', base_unit_quantity: 24 } },
              { id: 'pp2', is_active: false, template: { name: 'Costal', base_unit_quantity: 50 } },
            ],
          },
        },
      }
    }
    return {
      data: {
        data: {
          data: [
            { id: 'off1', presentation: { id: 'pp1' }, quoted_price: 480 },
            { id: 'off2', presentation: { id: 'pp2' }, quoted_price: 900 },
          ],
        },
      },
    }
  },
}))

describe('useReceiptLineFields', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('cascades product -> variant -> presentation, exposing only active options', () => {
    const setValue = vi.fn()
    const { result } = renderHook(() => useReceiptLineFields({ index: 0, supplierId: 's1', setValue }))

    act(() => result.current.onProductChange('p1'))
    expect(result.current.productId).toBe('p1')
    expect(result.current.variants.map((variant) => variant.id)).toEqual(['v1'])

    act(() => result.current.onVariantChange('v1'))
    expect(result.current.variantId).toBe('v1')
    expect(result.current.presentations.map((presentation) => presentation.id)).toEqual(['pp1'])
  })

  it('resets downstream fields and snapshots the presentation factor on selection', () => {
    const setValue = vi.fn()
    const { result } = renderHook(() => useReceiptLineFields({ index: 2, supplierId: 's1', setValue }))

    act(() => result.current.onProductChange('p1'))
    expect(setValue).toHaveBeenCalledWith('lines.2.variant_purchase_presentation_id', '')
    expect(setValue).toHaveBeenCalledWith('lines.2.supplier_offering_id', '')
    expect(setValue).toHaveBeenCalledWith('lines.2.presentation_factor', 0)

    act(() => result.current.onVariantChange('v1'))
    act(() => result.current.onPresentationChange('pp1'))

    expect(setValue).toHaveBeenCalledWith('lines.2.variant_purchase_presentation_id', 'pp1')
    expect(setValue).toHaveBeenCalledWith('lines.2.presentation_factor', 24)
  })

  it('filters supplier offerings down to the ones matching the chosen presentation', () => {
    const setValue = vi.fn()
    const { result } = renderHook(() => useReceiptLineFields({ index: 0, supplierId: 's1', setValue }))

    expect(result.current.offeringsForPresentation('pp1').map((offering) => offering.id)).toEqual(['off1'])
    expect(result.current.offeringsForPresentation('pp2').map((offering) => offering.id)).toEqual(['off2'])
  })
})
