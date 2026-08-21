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
  },
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  useUnitsOfMeasureSelect: vi.fn(),
}))

import { purchasePresentationTemplateApi } from '@/services/inventory-api'
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

const existingTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000AA',
  code: 'BOX_24',
  name: 'Box x24',
  package_type: 'BOX',
  base_unit_quantity: 24,
  compatible_dimension_uom: { id: 1, code: 'KG', name: 'Kilogram', symbol: 'kg' },
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

  it('creates the template on submit, coercing quantity/uom to numbers', async () => {
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
      compatible_dimension_uom_id: 1,
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
    expect(result.current.allErrors.code).toBe('Code is required')
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
})
