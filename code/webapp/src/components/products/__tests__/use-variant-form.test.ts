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
  },
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useUnitsOfMeasureSelect: vi.fn(),
}))

import { productVariantApi } from '@/services/inventory-api'
import { useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'

// ── Test data ──────────────────────────────────────────────────────────────────

const kilogram: UnitOfMeasure = {
  id: 1,
  code: 'KG',
  name: 'Kilogram',
  symbol: 'kg',
  type: 'WEIGHT',
  precision: 2,
  is_base: true,
  is_active: true,
}

const existingVariant: ProductVariant = {
  id: 7,
  item_id: 42,
  code: 'ARR-KG',
  barcode: '7501234567890',
  name: 'Arroz Premium 1kg',
  description: 'Grano largo',
  uom: { id: 1, code: 'KG', name: 'Kilogram', symbol: 'kg' },
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
      () => useVariantForm({ productId: 42, variant: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(false)
    expect(result.current.uoms).toEqual([kilogram])
  })

  it('is in editing mode with an existing variant', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: 42, variant: existingVariant, onSuccess: vi.fn() }),
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
      uom: { id: 9, code: 'LB', name: 'Pound', symbol: 'lb' },
    }
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: 42, variant: variantWithDeactivatedUom, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.uoms).toEqual([{ id: 9, code: 'LB', name: 'Pound', symbol: 'lb' }])
  })

  it('does not duplicate the current UOM when it is still active', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: 42, variant: existingVariant, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.uoms).toEqual([kilogram])
  })

  it('creates the variant on submit, scoping item_id to the given productId (no Item selector)', async () => {
    const created: ProductVariant = { ...existingVariant, id: 99, name: 'Arroz Integral 1kg' }
    vi.mocked(productVariantApi.create).mockResolvedValue({ data: { status: 201, data: created } } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: 42, variant: null, onSuccess }),
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

    expect(productVariantApi.create).toHaveBeenCalledWith(42, {
      name: 'Arroz Integral 1kg',
      code: 'arr-int-kg',
      barcode: null,
      uom_id: 1,
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
      () => useVariantForm({ productId: 42, variant: existingVariant, onSuccess }),
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

    expect(productVariantApi.update).toHaveBeenCalledWith(42, 7, expect.objectContaining({ is_active: false }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('rejects a blank name', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: 42, variant: null, onSuccess: vi.fn() }),
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
    expect(result.current.allErrors.name).toBe('Name is required')
  })

  it('requires a base unit', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useVariantForm({ productId: 42, variant: null, onSuccess: vi.fn() }),
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
    expect(result.current.allErrors.uom_id).toBe('Base unit is required')
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
      () => useVariantForm({ productId: 42, variant: null, onSuccess: vi.fn() }),
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
})
