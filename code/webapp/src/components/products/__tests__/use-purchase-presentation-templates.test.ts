// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePurchasePresentationTemplates } from '../use-purchase-presentation-templates'
import { inventoryQueryKeys } from '@/hooks/use-inventory-queries'
import type { PurchasePresentationTemplate } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  purchasePresentationTemplateApi: {
    list: vi.fn(),
  },
}))

import { purchasePresentationTemplateApi } from '@/services/inventory-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const boxTemplate: PurchasePresentationTemplate = {
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
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('usePurchasePresentationTemplates', () => {
  beforeEach(() => {
    vi.mocked(purchasePresentationTemplateApi.list).mockResolvedValue({
      data: { status: 200, data: [boxTemplate] },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch while the manager is closed', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => usePurchasePresentationTemplates(false), { wrapper })

    expect(purchasePresentationTemplateApi.list).not.toHaveBeenCalled()
  })

  it('loads every template (active and inactive) once opened', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    await waitFor(() => expect(result.current.templates).toHaveLength(1))

    expect(purchasePresentationTemplateApi.list).toHaveBeenCalledWith()
  })

  it('surfaces a toast when the template list fails to load', async () => {
    vi.mocked(purchasePresentationTemplateApi.list).mockRejectedValue(new Error('Network Error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts in list mode', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    expect(result.current.mode).toBe('list')
    expect(result.current.selectedTemplate).toBeNull()
  })

  it('opens create mode on New Template', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    act(() => result.current.handleNewTemplate())

    expect(result.current.mode).toBe('create')
  })

  it('opens edit mode on a template click', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    act(() => result.current.handleTemplateClick(boxTemplate))

    expect(result.current.mode).toBe('edit')
    expect(result.current.selectedTemplate).toEqual(boxTemplate)
  })

  it('returns to the list after a successful save', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    act(() => result.current.handleNewTemplate())
    act(() => result.current.handleTemplateSaved())

    expect(result.current.mode).toBe('list')
    expect(result.current.selectedTemplate).toBeNull()
  })

  it('invalidates the Assign-form template picker cache on save, not just the manager list', () => {
    const { wrapper, queryClient } = makeWrapper()
    // Seed the picker's cache the way usePurchasePresentationTemplatesSelect would, as if the
    // Assign form had already been opened once in this session.
    const selectKey = inventoryQueryKeys.purchasePresentationTemplates()
    queryClient.setQueryData(selectKey, { data: { data: [boxTemplate] } })

    const { result } = renderHook(() => usePurchasePresentationTemplates(true), { wrapper })

    act(() => result.current.handleNewTemplate())
    act(() => result.current.handleTemplateSaved())

    expect(queryClient.getQueryState(selectKey)?.isInvalidated).toBe(true)
  })

  it('resets to the list when the manager closes and reopens', () => {
    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => usePurchasePresentationTemplates(isOpen),
      { wrapper, initialProps: { isOpen: true } }
    )

    act(() => result.current.handleTemplateClick(boxTemplate))
    expect(result.current.mode).toBe('edit')

    rerender({ isOpen: false })
    rerender({ isOpen: true })

    expect(result.current.mode).toBe('list')
    expect(result.current.selectedTemplate).toBeNull()
  })
})
