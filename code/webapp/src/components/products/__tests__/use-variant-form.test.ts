// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVariantForm } from '../use-variant-form'
import type { ProductVariant, UnitOfMeasure } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  productVariantApi: {
    create: vi.fn(),
    update: vi.fn(),
    suggestCode: vi.fn(),
  },
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useUnitsOfMeasureSelect: vi.fn(),
}))

import { productVariantApi } from '@/services/inventory-api'
import { useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'

// ── Test data ──────────────────────────────────────────────────────────────────

const kilogram: UnitOfMeasure = {
  id: '1',
  code: 'KG',
  name: 'Kilogram',
  symbol: 'kg',
  type: 'WEIGHT',
  precision: 2,
  is_base: true,
  is_active: true,
}

const existingVariant: ProductVariant = {
  id: '7',
  item_id: '42',
  code: 'ARR-KG',
  barcode: '7501234567890',
  name: 'Arroz Premium 1kg',
  description: 'Grano largo',
  uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
  track_lot: false,
  track_serial: false,
  is_active: true,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

describe('useVariantForm', () => {
  beforeEach(() => {
    vi.mocked(productVariantApi.suggestCode).mockResolvedValue({ data: { code: 'ARR-KG', prefix: 'ARR-' } } as never)
    vi.mocked(useUnitsOfMeasureSelect).mockReturnValue({
      data: [kilogram],
      isLoading: false,
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to create mode with no variant', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(false)
    expect(result.current.uoms).toEqual([kilogram])
  })

  it('is in editing mode with an existing variant', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: existingVariant, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(true)
  })

  it('keeps the variant\'s current UOM selectable even after it was deactivated', () => {
    // useUnitsOfMeasureSelect only returns active UOMs (correct for the stock-movement forms
    // it's shared with). Without this, editing a Variant whose UOM has since been deactivated
    // would render the required select with no matching option, and — since the backend also
    // blocks a UOM change once the variant has stock/movement history — the variant would
    // become impossible to edit or deactivate at all.
    vi.mocked(useUnitsOfMeasureSelect).mockReturnValue({
      data: [],
      isLoading: false,
    } as never)
    const variantWithDeactivatedUom: ProductVariant = {
      ...existingVariant,
      uom: { id: '9', code: 'LB', name: 'Pound', symbol: 'lb' },
    }
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: variantWithDeactivatedUom, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.uoms).toEqual([{ id: '9', code: 'LB', name: 'Pound', symbol: 'lb' }])
  })

  it('does not duplicate the current UOM when it is still active', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: existingVariant, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.uoms).toEqual([kilogram])
  })

  it('creates the variant on submit, scoping item_id to the given productId (no Item selector)', async () => {
    const created: ProductVariant = { ...existingVariant, id: '99', name: 'Arroz Integral 1kg' }
    vi.mocked(productVariantApi.create).mockResolvedValue({ data: { status: 201, data: created } } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        name: 'Arroz Integral 1kg',
        code: 'arr-int-kg',
        barcode: '',
        uom_id: '1',
        description: '',
        track_lot: false,
        track_serial: false,
        is_active: true,
      })
    })

    expect(productVariantApi.create).toHaveBeenCalledWith('42', {
      name: 'Arroz Integral 1kg',
      code: 'arr-int-kg',
      barcode: null,
      uom_id: '1',
      description: null,
      track_lot: false,
      track_serial: false,
      is_active: true,
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created))
  })

  it('updates the variant on submit when editing', async () => {
    vi.mocked(productVariantApi.update).mockResolvedValue({
      data: { status: 200, data: existingVariant },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: existingVariant, onSuccess }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        name: 'Arroz Premium 1kg',
        code: 'ARR-KG',
        barcode: '7501234567890',
        uom_id: '1',
        description: 'Grano largo',
        track_lot: false,
        track_serial: false,
        is_active: false,
      })
    })

    expect(productVariantApi.update).toHaveBeenCalledWith('42', '7', expect.objectContaining({ is_active: false }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('rejects a blank name', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('code', 'ARR-KG')
      result.current.setValue('uom_id', '1')
    })

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(productVariantApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.name).toBe('El nombre es requerido')
  })

  it('requires a base unit', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('name', 'New Variant')
      result.current.setValue('code', 'NEW-VAR')
    })

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(productVariantApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.uom_id).toBe('La unidad base es requerida')
  })

  it('surfaces server-side validation errors alongside client ones', async () => {
    const error = new AxiosError(
      'Validation failed',
      '422',
      undefined,
      undefined,
      {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: {} as never,
        data: { status: 422, message: 'Validation failed', errors: { code: ['SKU already taken'] } },
      } as never
    )
    vi.mocked(productVariantApi.create).mockRejectedValue(error)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        name: 'Duplicate SKU',
        code: 'ARR-KG',
        barcode: '',
        uom_id: '1',
        description: '',
        track_lot: false,
        track_serial: false,
        is_active: true,
      })
    })

    await waitFor(() => expect(result.current.allErrors.code).toBe('SKU already taken'))
  })

  it('prefills and regenerates an untouched contextual suggestion when name or UOM changes', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('name', '1 kg')
      result.current.setValue('uom_id', '1')
    })

    await waitFor(() => expect(productVariantApi.suggestCode).toHaveBeenCalledWith('42', {
      name: '1 kg',
      uom_id: '1',
    }), { timeout: 1500 })
    await waitFor(() => expect(result.current.currentCode).toBe('ARR-KG'))

    vi.mocked(productVariantApi.suggestCode).mockResolvedValue({ data: { code: 'ARR-500G', prefix: 'ARR-' } } as never)
    act(() => {
      result.current.setValue('name', '500 g')
    })

    await waitFor(() => expect(result.current.currentCode).toBe('ARR-500G'), { timeout: 1500 })
  })

  it('never fetches or overwrites the persisted SKU in edit mode', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: existingVariant, onSuccess: vi.fn() }),
      { wrapper }
    )

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(productVariantApi.suggestCode).not.toHaveBeenCalled()
    expect(result.current.currentCode).toBe('ARR-KG')
  })

  it('preserves a manual SKU across context changes and regenerates only on explicit action', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('name', '1 kg')
      result.current.setValue('uom_id', '1')
    })
    await waitFor(() => expect(result.current.currentCode).toBe('ARR-KG'), { timeout: 1500 })

    act(() => {
      result.current.setValue('code', 'MI-SKU')
      result.current.onCodeChange({ target: { name: 'code', value: 'MI-SKU' }, type: 'change' } as never)
      result.current.setValue('name', '500 g')
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(result.current.currentCode).toBe('MI-SKU')
    expect(productVariantApi.suggestCode).toHaveBeenCalledTimes(1)

    act(() => result.current.handleRefreshCode())
    await waitFor(() => expect(result.current.currentCode).toBe('ARR-KG'))
  })

  it('disables submission while a complete context is waiting for its initial suggestion', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('name', '1 kg')
      result.current.setValue('uom_id', '1')
    })

    expect(result.current.isSubmitDisabled).toBe(true)
    await waitFor(() => expect(result.current.currentCode).toBe('ARR-KG'), { timeout: 1500 })
    expect(result.current.isSubmitDisabled).toBe(false)
  })

  it('keeps a manual SKU after a collision and clears stale validation when it changes', async () => {
    const error = new AxiosError('Validation failed', '422', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as never,
      data: {
        message: 'El SKU ya está en uso.',
        errors: { code: ['El SKU ya está en uso.'] },
        rejected_code: 'MI-SKU',
        suggested_code: 'ARR-KG-002',
      },
    } as never)
    vi.mocked(productVariantApi.create).mockRejectedValue(error)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: '42', variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('code', 'MI-SKU')
      result.current.onCodeChange({ target: { name: 'code', value: 'MI-SKU' }, type: 'change' } as never)
    })
    await act(async () => {
      await result.current.onSubmit({
        name: '1 kg', code: 'MI-SKU', barcode: '', uom_id: '1', description: '',
        track_lot: false, track_serial: false, is_active: true,
      })
    })

    await waitFor(() => expect(result.current.collision).toEqual({
      rejectedCode: 'MI-SKU', suggestedCode: 'ARR-KG-002',
    }))
    expect(result.current.currentCode).toBe('MI-SKU')
    expect(result.current.canApplySuggestedCode).toBe(true)
    expect(result.current.allErrors.code).toBeUndefined()

    act(() => {
      result.current.setValue('code', 'NUEVO-SKU')
      result.current.onCodeChange({ target: { name: 'code', value: 'NUEVO-SKU' }, type: 'change' } as never)
    })
    expect(result.current.collision).toBeNull()
    expect(result.current.allErrors.code).toBeUndefined()
  })
})
