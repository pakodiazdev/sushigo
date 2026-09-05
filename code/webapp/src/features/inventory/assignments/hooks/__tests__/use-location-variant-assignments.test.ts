// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLocationVariantAssignments } from '../use-location-variant-assignments'

const showSuccess = vi.fn()
const showError = vi.fn()
const canAccess = vi.hoisted(() => ({ value: true }))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess, showError }),
}))

vi.mock('@/hooks/use-can-access', () => ({
  useCanAccess: () => canAccess.value,
}))

vi.mock('../../api/variant-assignment-api', () => ({
  variantAssignmentApi: { list: vi.fn(), assign: vi.fn(), unassign: vi.fn() },
}))

import { variantAssignmentApi } from '../../api/variant-assignment-api'

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

const listResponse = (
  rows: unknown[],
  meta: { current_page?: number; last_page?: number; total?: number } = {}
) => ({
  data: {
    status: 200,
    data: rows,
    meta: { current_page: 1, last_page: 1, total: rows.length, ...meta },
  },
})

describe('useLocationVariantAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canAccess.value = true
    vi.mocked(variantAssignmentApi.list).mockResolvedValue(listResponse([]) as never)
  })

  afterEach(() => cleanup())

  it('defaults to the assigned slice and exposes returned rows', async () => {
    const rows = [
      { assignment_id: 'a1', assigned: true, inventory_location_id: 'loc-1', item_variant_id: 'v1', item_variant_code: 'AAA', item_variant_name: 'A', assigned_at: null },
    ]
    vi.mocked(variantAssignmentApi.list).mockResolvedValue(listResponse(rows) as never)

    const { result } = renderHook(() => useLocationVariantAssignments('loc-1'), { wrapper: wrapper() })

    expect(result.current.state).toBe('assigned')
    await waitFor(() => expect(result.current.rows).toHaveLength(1))
    expect(variantAssignmentApi.list).toHaveBeenCalledWith('loc-1', {
      state: 'assigned',
      search: undefined,
      per_page: 50,
      page: 1,
    })
  })

  it('exposes a next page and accumulates rows when loadMore is called', async () => {
    vi.mocked(variantAssignmentApi.list)
      .mockResolvedValueOnce(
        listResponse([{ item_variant_id: 'v1', item_variant_code: 'A' }], {
          current_page: 1,
          last_page: 2,
          total: 2,
        }) as never
      )
      .mockResolvedValueOnce(
        listResponse([{ item_variant_id: 'v2', item_variant_code: 'B' }], {
          current_page: 2,
          last_page: 2,
          total: 2,
        }) as never
      )

    const { result } = renderHook(() => useLocationVariantAssignments('loc-1'), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.rows).toHaveLength(1))
    expect(result.current.hasMore).toBe(true)
    expect(result.current.total).toBe(2)

    await act(async () => {
      await result.current.loadMore()
    })

    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    expect(variantAssignmentApi.list).toHaveBeenNthCalledWith(2, 'loc-1', {
      state: 'assigned',
      search: undefined,
      per_page: 50,
      page: 2,
    })
    expect(result.current.hasMore).toBe(false)
  })

  it('refetches with the new state and search term', async () => {
    const { result } = renderHook(() => useLocationVariantAssignments('loc-1'), { wrapper: wrapper() })

    act(() => result.current.setState('unassigned'))
    act(() => result.current.setSearch('rice'))

    await waitFor(() =>
      expect(variantAssignmentApi.list).toHaveBeenCalledWith('loc-1', {
        state: 'unassigned',
        search: 'rice',
        per_page: 50,
        page: 1,
      })
    )
  })

  it('assigns a variant and shows a success toast', async () => {
    vi.mocked(variantAssignmentApi.assign).mockResolvedValue({ data: { status: 201 } } as never)
    const { result } = renderHook(() => useLocationVariantAssignments('loc-1'), { wrapper: wrapper() })

    act(() => result.current.assign('v9'))

    await waitFor(() => expect(variantAssignmentApi.assign).toHaveBeenCalledWith('loc-1', 'v9'))
    await waitFor(() => expect(showSuccess).toHaveBeenCalled())
  })

  it('surfaces the server rejection message when unassign fails (409)', async () => {
    vi.mocked(variantAssignmentApi.unassign).mockRejectedValue(new Error('still has stock'))
    const { result } = renderHook(() => useLocationVariantAssignments('loc-1'), { wrapper: wrapper() })

    act(() => result.current.unassign('v9'))

    await waitFor(() => expect(showError).toHaveBeenCalled())
  })

  it('does not mutate for a viewer without stock.manage', () => {
    canAccess.value = false
    const { result } = renderHook(() => useLocationVariantAssignments('loc-1'), { wrapper: wrapper() })

    expect(result.current.canManage).toBe(false)
    act(() => result.current.assign('v1'))
    act(() => result.current.unassign('v2'))
    expect(variantAssignmentApi.assign).not.toHaveBeenCalled()
    expect(variantAssignmentApi.unassign).not.toHaveBeenCalled()
  })
})
