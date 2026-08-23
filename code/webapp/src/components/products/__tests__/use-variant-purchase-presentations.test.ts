// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVariantPurchasePresentations } from '../use-variant-purchase-presentations'
import type { VariantPurchasePresentation } from '@/types/inventory'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}))

vi.mock('@/services/inventory-api', () => ({
  variantPurchasePresentationApi: {
    list: vi.fn(),
  },
}))

import { variantPurchasePresentationApi } from '@/services/inventory-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const boxPresentation: VariantPurchasePresentation = {
  id: '01JPRES0000000000000000AA',
  item_variant_id: 7,
  template: { id: '01JTPL00000000000000000AA', code: 'BOX_24', name: 'Box x24', package_type: 'BOX', base_unit_quantity: 24 },
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

describe('useVariantPurchasePresentations', () => {
  beforeEach(() => {
    vi.mocked(variantPurchasePresentationApi.list).mockResolvedValue({
      data: { status: 200, data: [boxPresentation] },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when variantId is null', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useVariantPurchasePresentations('42', null, true), { wrapper })

    expect(variantPurchasePresentationApi.list).not.toHaveBeenCalled()
  })

  it('does not fetch while unreachable, even with ids set', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useVariantPurchasePresentations('42', '7', false), { wrapper })

    expect(variantPurchasePresentationApi.list).not.toHaveBeenCalled()
  })

  it('loads presentations for the given variant', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    await waitFor(() => expect(result.current.presentations).toHaveLength(1))

    expect(variantPurchasePresentationApi.list).toHaveBeenCalledWith('42', '7')
    expect(result.current.presentations[0]!.template?.name).toBe('Box x24')
  })

  it('surfaces a toast when the presentation list fails to load, instead of silently rendering empty', async () => {
    vi.mocked(variantPurchasePresentationApi.list).mockRejectedValue(new Error('Network Error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.presentations).toEqual([])
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts in list mode', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    expect(result.current.presentationMode).toBe('list')
    expect(result.current.selectedPresentation).toBeNull()
  })

  it('opens assign mode on + Assign template', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    act(() => result.current.handleAssignPresentation())

    expect(result.current.presentationMode).toBe('assign')
    expect(result.current.selectedPresentation).toBeNull()
  })

  it('opens edit mode on a presentation click', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    act(() => result.current.handlePresentationClick(boxPresentation))

    expect(result.current.presentationMode).toBe('edit')
    expect(result.current.selectedPresentation).toEqual(boxPresentation)
  })

  it('goes back to the list and clears the selected presentation', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    act(() => result.current.handlePresentationClick(boxPresentation))
    act(() => result.current.handleBackToList())

    expect(result.current.presentationMode).toBe('list')
    expect(result.current.selectedPresentation).toBeNull()
  })

  it('returns to the list after a successful assign or update', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useVariantPurchasePresentations('42', '7', true), { wrapper })

    act(() => result.current.handleAssignPresentation())
    act(() => result.current.handlePresentationSaved())

    expect(result.current.presentationMode).toBe('list')
    expect(result.current.selectedPresentation).toBeNull()
  })

  it('resets to the list when switching to a different Variant', async () => {
    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(
      ({ variantId }: { variantId: string | null }) => useVariantPurchasePresentations('42', variantId, true),
      { wrapper, initialProps: { variantId: '7' } }
    )

    act(() => result.current.handlePresentationClick(boxPresentation))
    expect(result.current.presentationMode).toBe('edit')

    rerender({ variantId: '9' })

    expect(result.current.presentationMode).toBe('list')
    expect(result.current.selectedPresentation).toBeNull()
  })
})
