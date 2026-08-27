// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLocationReplenishmentPolicies } from '../use-location-replenishment-policies'

const showSuccess = vi.fn()
const showError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess, showError }),
}))

vi.mock('../../api/replenishment-api', () => ({
  replenishmentPolicyApi: { upsert: vi.fn(), remove: vi.fn() },
}))

import { replenishmentPolicyApi } from '../../api/replenishment-api'

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

describe('useLocationReplenishmentPolicies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tracks which variant row is being edited', () => {
    const { result } = renderHook(() => useLocationReplenishmentPolicies('loc-1'), { wrapper: wrapper() })

    expect(result.current.editingVariantId).toBeNull()
    act(() => result.current.startEditing('var-1'))
    expect(result.current.editingVariantId).toBe('var-1')
    act(() => result.current.cancelEditing())
    expect(result.current.editingVariantId).toBeNull()
  })

  it('saves via upsert and clears the editing row on success', async () => {
    vi.mocked(replenishmentPolicyApi.upsert).mockResolvedValue({ data: { status: 200, data: {}, meta: null } } as never)
    const { result } = renderHook(() => useLocationReplenishmentPolicies('loc-1'), { wrapper: wrapper() })

    act(() => result.current.startEditing('var-1'))
    act(() => result.current.save('var-1', { min_stock: 5, max_stock: 50, notes: null }))

    await waitFor(() => expect(replenishmentPolicyApi.upsert).toHaveBeenCalledWith('loc-1', 'var-1', {
      min_stock: 5,
      max_stock: 50,
      notes: null,
    }))
    await waitFor(() => expect(result.current.editingVariantId).toBeNull())
    expect(showSuccess).toHaveBeenCalled()
  })

  it('surfaces an error toast when the upsert fails', async () => {
    vi.mocked(replenishmentPolicyApi.upsert).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useLocationReplenishmentPolicies('loc-1'), { wrapper: wrapper() })

    act(() => result.current.save('var-1', { min_stock: 5, max_stock: 50, notes: null }))

    await waitFor(() => expect(showError).toHaveBeenCalled())
  })

  it('clears a policy via remove', async () => {
    vi.mocked(replenishmentPolicyApi.remove).mockResolvedValue({ status: 204 } as never)
    const { result } = renderHook(() => useLocationReplenishmentPolicies('loc-1'), { wrapper: wrapper() })

    act(() => result.current.clear('var-2'))

    await waitFor(() => expect(replenishmentPolicyApi.remove).toHaveBeenCalledWith('loc-1', 'var-2'))
    await waitFor(() => expect(showSuccess).toHaveBeenCalled())
  })
})
