// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePurchasePresentationForm } from '../use-purchase-presentation-form'
import type { PurchasePresentationTemplate, VariantPurchasePresentation } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  variantPurchasePresentationApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
  usePurchasePresentationTemplatesSelect: vi.fn(),
}))

import { variantPurchasePresentationApi } from '@/services/inventory-api'
import { usePurchasePresentationTemplatesSelect } from '@/hooks/use-inventory-queries'

// ── Test data ──────────────────────────────────────────────────────────────────

const kgUom = { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg' }
const lbUom = { id: '2', code: 'LB', name: 'Pound', symbol: 'lb' }

const boxTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000AA',
  code: 'BOX_24',
  name: 'Box x24',
  package_type: 'BOX',
  base_unit_quantity: 24,
  compatible_dimension_uom: kgUom,
  is_active: true,
}

const packTemplate: PurchasePresentationTemplate = {
  id: '01JTPL00000000000000000BB',
  code: 'PACK_6',
  name: 'Pack x6',
  package_type: 'PACK',
  base_unit_quantity: 6,
  compatible_dimension_uom: lbUom,
  is_active: true,
}

const existingPresentation: VariantPurchasePresentation = {
  id: '01JPRES0000000000000000AA',
  item_variant_id: 7,
  template: { id: boxTemplate.id, code: boxTemplate.code, name: boxTemplate.name, package_type: boxTemplate.package_type, base_unit_quantity: boxTemplate.base_unit_quantity },
  package_barcode: '7501234567913',
  is_default: true,
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

describe('usePurchasePresentationForm', () => {
  beforeEach(() => {
    vi.mocked(usePurchasePresentationTemplatesSelect).mockReturnValue({
      data: [boxTemplate, packTemplate],
      isLoading: false,
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to create (assign) mode with no presentation', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: null,
          assignedTemplateIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(false)
  })

  it('excludes already-assigned templates from the assignable options', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: null,
          assignedTemplateIds: [boxTemplate.id],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    expect(result.current.assignableTemplates).toEqual([packTemplate])
  })

  it('is in editing mode with an existing presentation, template pre-selected', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: existingPresentation,
          assignedTemplateIds: [boxTemplate.id],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    expect(result.current.isEditing).toBe(true)
    expect(result.current.selectedTemplate?.id).toBe(boxTemplate.id)
  })

  it('flags a UOM mismatch and blocks submit before hitting the API', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: lbUom,
          presentation: null,
          assignedTemplateIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    act(() => result.current.setValue('template_id', boxTemplate.id))
    expect(result.current.isUomMismatch).toBe(true)

    await act(async () => {
      await result.current.onSubmit({ template_id: boxTemplate.id, package_barcode: '', is_default: false, is_active: true })
    })

    expect(variantPurchasePresentationApi.create).not.toHaveBeenCalled()
  })

  it('builds a human-readable normalization hint for the selected template', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: null,
          assignedTemplateIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    act(() => result.current.setValue('template_id', boxTemplate.id))

    expect(result.current.normalizationHint).toBe('1 Box x24 = 24 kg')
  })

  it('assigns the selected template on submit', async () => {
    const created: VariantPurchasePresentation = existingPresentation
    vi.mocked(variantPurchasePresentationApi.create).mockResolvedValue({
      data: { status: 201, data: created },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: null,
          assignedTemplateIds: [],
          onSuccess,
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        template_id: boxTemplate.id,
        package_barcode: '7501234567913',
        is_default: true,
        is_active: true,
      })
    })

    expect(variantPurchasePresentationApi.create).toHaveBeenCalledWith('42', '7', {
      template_id: boxTemplate.id,
      package_barcode: '7501234567913',
      is_default: true,
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created))
  })

  it('updates an existing presentation on submit, without resending template_id', async () => {
    vi.mocked(variantPurchasePresentationApi.update).mockResolvedValue({
      data: { status: 200, data: { ...existingPresentation, is_active: false } },
    } as never)
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: existingPresentation,
          assignedTemplateIds: [boxTemplate.id],
          onSuccess,
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        template_id: boxTemplate.id,
        package_barcode: '7501234567913',
        is_default: true,
        is_active: false,
      })
    })

    expect(variantPurchasePresentationApi.update).toHaveBeenCalledWith('42', '7', existingPresentation.id, {
      package_barcode: '7501234567913',
      is_default: true,
      is_active: false,
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('rejects submit with no template selected', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: null,
          assignedTemplateIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.handleSubmit(vi.fn())()
    })

    expect(variantPurchasePresentationApi.create).not.toHaveBeenCalled()
    expect(result.current.allErrors.template_id).toBe('Template is required')
  })

  it('surfaces server-side validation errors (e.g. duplicate assignment race) without resetting the form', async () => {
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
        data: { status: 422, message: 'Validation failed', errors: { template_id: ['This template is already assigned to this Variant.'] } },
      } as never
    )
    vi.mocked(variantPurchasePresentationApi.create).mockRejectedValue(error)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        usePurchasePresentationForm({
          productId: '42',
          variantId: '7',
          variantUom: kgUom,
          presentation: null,
          assignedTemplateIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.onSubmit({
        template_id: boxTemplate.id,
        package_barcode: '',
        is_default: false,
        is_active: true,
      })
    })

    await waitFor(() =>
      expect(result.current.allErrors.template_id).toBe('This template is already assigned to this Variant.')
    )
  })
})
