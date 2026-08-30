// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePurchasePresentationTemplateForm } from '../use-purchase-presentation-template-form'
import type { PurchasePresentationTemplate, UnitOfMeasure } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  purchasePresentationTemplateApi: {
    create: vi.fn(),
    update: vi.fn(),
    suggestCode: vi.fn(),
  },
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useUnitsOfMeasureSelect: vi.fn(),
}))

import { purchasePresentationTemplateApi } from '@/services/inventory-api'
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

const existingTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000AA',
  code: 'BOX_24',
  name: 'Box x24',
  package_type: 'BOX',
  base_unit_quantity: 24,
  compatible_dimension_uom: { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' },
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

describe('usePurchasePresentationTemplateForm', () => {
  beforeEach(() => {
    vi.mocked(useUnitsOfMeasureSelect).mockReturnValue({
      data: [kilogram],
      isLoading: false,
    } as never)
    vi.mocked(purchasePresentationTemplateApi.suggestCode).mockResolvedValue({ data: { code: 'BOX_24' } } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to create mode with no template', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(false)
  })

  it('is in editing mode with an existing template', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: existingTemplate, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(true)
  })

  it("keeps the template's current compatible UOM selectable even after it was deactivated", () => {
    // useUnitsOfMeasureSelect only returns active UOMs (correct for the create form, where
    // offering an inactive unit as a new choice would be wrong). But editing a template whose
    // compatible UOM has since been deactivated must still show it as the selected option;
    // otherwise the required select renders empty, and updating any other field on that
    // template fails client-side with "Compatible unit is required".
    vi.mocked(useUnitsOfMeasureSelect).mockReturnValue({
      data: [],
      isLoading: false,
    } as never)
    const templateWithDeactivatedUom: PurchasePresentationTemplate = {
      ...existingTemplate,
      compatible_dimension_uom: { id: '9', code: 'LB', name: 'Pound', symbol: 'lb' },
    }
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: templateWithDeactivatedUom, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.uoms).toEqual([{ id: '9', code: 'LB', name: 'Pound', symbol: 'lb' }])
  })

  it('does not duplicate the current UOM when it is still active', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: existingTemplate, onSuccess: vi.fn() }),
      { wrapper }
    )

    expect(result.current.uoms).toEqual([kilogram])
  })

  it('creates the template on submit, preserving the public UOM while coercing quantity to a number', async () => {
    const created = { ...existingTemplate, id: '01JTPL00000000000000000BB', code: 'PACK_6' }
    vi.mocked(purchasePresentationTemplateApi.create).mockResolvedValue({
      data: { status: 201, data: created },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        code: 'pack_6',
        name: 'Pack x6',
        package_type: 'PACK',
        base_unit_quantity: '6',
        compatible_dimension_uom_id: '1',
        is_active: true,
      })
    })

    expect(purchasePresentationTemplateApi.create).toHaveBeenCalledWith({
      code: 'pack_6',
      name: 'Pack x6',
      package_type: 'PACK',
      base_unit_quantity: 6,
      compatible_dimension_uom_id: '1',
      is_active: true,
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created))
  })

  it('updates the template on submit when editing', async () => {
    vi.mocked(purchasePresentationTemplateApi.update).mockResolvedValue({
      data: { status: 200, data: { ...existingTemplate, is_active: false } },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: existingTemplate, onSuccess }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        code: 'BOX_24',
        name: 'Box x24',
        package_type: 'BOX',
        base_unit_quantity: '24',
        compatible_dimension_uom_id: '1',
        is_active: false,
      })
    })

    expect(purchasePresentationTemplateApi.update).toHaveBeenCalledWith(
      existingTemplate.id,
      expect.objectContaining({ is_active: false })
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('rejects a blank code', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('name', 'Pack x6')
      result.current.setValue('package_type', 'PACK')
      result.current.setValue('base_unit_quantity', '6')
      result.current.setValue('compatible_dimension_uom_id', '1')
    })

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(purchasePresentationTemplateApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.code).toBe('El código es requerido')
  })

  it('surfaces server-side validation errors, e.g. rejecting an immutable-field change once assigned', async () => {
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
        data: {
          status: 422,
          message: 'Validation failed',
          errors: { base_unit_quantity: ['This field cannot be changed once the template has been assigned to a Variant.'] },
        },
      } as never
    )
    vi.mocked(purchasePresentationTemplateApi.update).mockRejectedValue(error)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: existingTemplate, onSuccess: vi.fn() }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        code: 'BOX_24',
        name: 'Box x24',
        package_type: 'BOX',
        base_unit_quantity: '30',
        compatible_dimension_uom_id: '1',
        is_active: true,
      })
    })

    await waitFor(() =>
      expect(result.current.allErrors.base_unit_quantity).toBe(
        'This field cannot be changed once the template has been assigned to a Variant.'
      )
    )
  })

  it('fills and updates the suggestion while create context changes and the code is untouched', async () => {
    vi.mocked(purchasePresentationTemplateApi.suggestCode).mockImplementation(async ({ base_unit_quantity }) => ({
      data: { code: `BOX_${base_unit_quantity}` },
    }) as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('package_type', 'BOX')
      result.current.setValue('base_unit_quantity', '24')
      result.current.setValue('compatible_dimension_uom_id', '1')
    })
    await waitFor(() => expect(result.current.currentCode).toBe('BOX_24'))

    act(() => result.current.setValue('base_unit_quantity', '12'))
    await waitFor(() => expect(result.current.currentCode).toBe('BOX_12'))
  })

  it('debounces quantity-driven suggestions until typing pauses', async () => {
    vi.mocked(purchasePresentationTemplateApi.suggestCode).mockResolvedValue({
      data: { code: 'BOX_1440' },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper },
    )

    act(() => {
      result.current.setValue('package_type', 'BOX')
      result.current.setValue('compatible_dimension_uom_id', '1')
      result.current.setValue('base_unit_quantity', '1')
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    act(() => result.current.setValue('base_unit_quantity', '14'))
    await new Promise((resolve) => setTimeout(resolve, 100))
    act(() => result.current.setValue('base_unit_quantity', '144'))
    await new Promise((resolve) => setTimeout(resolve, 100))
    act(() => result.current.setValue('base_unit_quantity', '1440'))

    expect(purchasePresentationTemplateApi.suggestCode).not.toHaveBeenCalled()
    await waitFor(() => expect(purchasePresentationTemplateApi.suggestCode).toHaveBeenCalledTimes(1))
    expect(purchasePresentationTemplateApi.suggestCode).toHaveBeenCalledWith(expect.objectContaining({
      base_unit_quantity: 1440,
    }))
  })

  it('does not request or replace a persisted code in edit mode', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: existingTemplate, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => result.current.setValue('base_unit_quantity', '12'))

    expect(result.current.currentCode).toBe('BOX_24')
    expect(purchasePresentationTemplateApi.suggestCode).not.toHaveBeenCalled()
  })

  it('keeps a manual code across context changes until explicit regeneration', async () => {
    vi.mocked(purchasePresentationTemplateApi.suggestCode)
      .mockResolvedValueOnce({ data: { code: 'BOX_24' } } as never)
      .mockResolvedValueOnce({ data: { code: 'BOX_12' } } as never)
      .mockResolvedValueOnce({ data: { code: 'BOX_12_KG' } } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.setValue('package_type', 'BOX')
      result.current.setValue('base_unit_quantity', '24')
      result.current.setValue('compatible_dimension_uom_id', '1')
    })
    await waitFor(() => expect(result.current.currentCode).toBe('BOX_24'))

    act(() => {
      result.current.onCodeChange({ target: { name: 'code', value: 'MI_CAJA' }, type: 'change' } as never)
      result.current.setValue('base_unit_quantity', '12')
    })
    await waitFor(() => expect(purchasePresentationTemplateApi.suggestCode).toHaveBeenCalledTimes(2))
    expect(result.current.currentCode).toBe('MI_CAJA')

    act(() => result.current.handleRefreshCode())
    await waitFor(() => expect(result.current.currentCode).toBe('BOX_12_KG'))
  })

  it('preserves a manual code on collision and applies the replacement only explicitly', async () => {
    const collisionError = new AxiosError('Validation failed', '422', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as never,
      data: {
        message: 'El código ya está en uso.',
        errors: { code: ['El código ya está en uso.'] },
        rejected_code: 'MI_CODIGO',
        suggested_code: 'BOX_24_KG',
      },
    } as never)
    vi.mocked(purchasePresentationTemplateApi.create).mockRejectedValue(collisionError)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper }
    )

    act(() => {
      result.current.onCodeChange({ target: { name: 'code', value: 'MI_CODIGO' }, type: 'change' } as never)
    })
    await act(async () => {
      await result.current.onSubmit({
        code: 'MI_CODIGO', name: 'Caja', package_type: 'BOX', base_unit_quantity: '24',
        compatible_dimension_uom_id: '1', is_active: true,
      })
    })

    expect(result.current.currentCode).toBe('MI_CODIGO')
    expect(result.current.collision?.suggestedCode).toBe('BOX_24_KG')
    expect(mockShowError).not.toHaveBeenCalled()

    act(() => result.current.applySuggestedCode())
    expect(result.current.currentCode).toBe('BOX_24_KG')
  })

  it('discards an untouched collision replacement when the suggestion context changes', async () => {
    vi.mocked(purchasePresentationTemplateApi.suggestCode)
      .mockResolvedValueOnce({ data: { code: 'BOX_24' } } as never)
      .mockResolvedValueOnce({ data: { code: 'BOX_12' } } as never)
    vi.mocked(purchasePresentationTemplateApi.create).mockRejectedValue(
      new AxiosError('Validation failed', '422', undefined, undefined, {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: {} as never,
        data: {
          errors: { code: ['El código ya está en uso.'] },
          rejected_code: 'BOX_24',
          suggested_code: 'BOX_24_KG',
        },
      } as never),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper },
    )

    act(() => {
      result.current.setValue('package_type', 'BOX')
      result.current.setValue('base_unit_quantity', '24')
      result.current.setValue('compatible_dimension_uom_id', '1')
    })
    await waitFor(() => expect(result.current.currentCode).toBe('BOX_24'))

    await act(async () => {
      await result.current.onSubmit({
        code: 'BOX_24', name: 'Caja', package_type: 'BOX', base_unit_quantity: '24',
        compatible_dimension_uom_id: '1', is_active: true,
      })
    })
    expect(result.current.currentCode).toBe('BOX_24_KG')

    act(() => result.current.setValue('base_unit_quantity', '12'))

    await waitFor(() => expect(result.current.currentCode).toBe('BOX_12'))
    expect(result.current.collision).toBeNull()
  })

  it('clears a generated code when its suggestion context becomes incomplete', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => usePurchasePresentationTemplateForm({ template: null, onSuccess: vi.fn() }),
      { wrapper },
    )

    act(() => {
      result.current.setValue('package_type', 'BOX')
      result.current.setValue('base_unit_quantity', '24')
      result.current.setValue('compatible_dimension_uom_id', '1')
    })
    await waitFor(() => expect(result.current.currentCode).toBe('BOX_24'))

    act(() => result.current.setValue('base_unit_quantity', ''))

    await waitFor(() => expect(result.current.currentCode).toBe(''))
    expect(result.current.isCodeSuggested).toBe(false)
  })
})
